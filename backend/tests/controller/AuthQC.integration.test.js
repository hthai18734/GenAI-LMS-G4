const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../../src/model/identity/User');
const OtpVerification = require('../../src/model/identity/OtpVerification');
const OAuthLoginTicket = require('../../src/model/identity/OAuthLoginTicket');
const OAuthAccount = require('../../src/model/identity/OAuthAccount');
const RefreshSession = require('../../src/model/identity/RefreshSession');
const OAuthLoginTicketRepository = require('../../src/infrastructure/persistence/mongoose/repositories/identity/OAuthLoginTicketRepository');
const OAuthUtil = require('../../src/utils/auth/OAuthUtil');
const EmailUtil = require('../../src/utils/email/EmailUtil');
const PasswordUtil = require('../../src/utils/auth/PasswordUtil');
const JWTUtil = require('../../src/utils/auth/JWTUtil');
const { app } = require('../../src/index');

test('QC registration, Google OAuth and account security with MongoDB', { skip: !process.env.TEST_MONGODB_URI }, async (t) => {
  const config = { JWT_ACCESS_SECRET: 'auth-qc-test-secret', GOOGLE_CLIENT_ID: 'qc-client.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'qc-test-secret', GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback', FRONTEND_URL: 'http://localhost:5173', CORS_ORIGIN: 'http://localhost:5173' };
  const oldEnv = {};
  for (const key of Object.keys(config)) { oldEnv[key] = process.env[key]; process.env[key] = config[key]; }
  const original = { exchange: OAuthUtil.exchangeCode, sendOtp: EmailUtil.sendOtp, sendReset: EmailUtil.sendPasswordReset };
  const delivered = new Map();
  const resetLinks = new Map();
  let profile = { sub: 'google-qc', email: 'googleqc@test.edu', name: 'Google Learner', email_verified: true };
  let exchanges = 0;
  OAuthUtil.exchangeCode = async () => { exchanges++; return { profile }; };
  EmailUtil.sendOtp = async (email, otp) => { delivered.set(email, otp); };
  EmailUtil.sendPasswordReset = async (email, url) => { resetLinks.set(email, new URL(url).searchParams.get('token')); };
  await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName: `ai_lms_test_qc_${crypto.randomBytes(8).toString('hex')}` });
  await Promise.all([User.init(), OtpVerification.init(), OAuthLoginTicket.init(), OAuthAccount.init(), RefreshSession.init()]);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    OAuthUtil.exchangeCode = original.exchange; EmailUtil.sendOtp = original.sendOtp; EmailUtil.sendPasswordReset = original.sendReset;
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
    for (const key of Object.keys(config)) { if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key]; }
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', body, token, cookie } = {}) {
    const response = await fetch(`${base}${path}`, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, location: response.headers.get('location'), cookie: response.headers.get('set-cookie'), ...(response.headers.get('content-type')?.includes('application/json') ? await response.json() : {}) };
  }
  async function beginGoogle(prefix = '/api/auth') {
    const res = await request(`${prefix}/google?origin=http://localhost:5173`);
    assert.equal(res.status, 200);
    return { state: new URL(res.data.url).searchParams.get('state'), cookie: res.cookie.split(';')[0], rawCookie: res.cookie };
  }
  async function callback(start, prefix = '/api/auth') {
    return request(`${prefix}/google/callback?code=provider-test-code&state=${encodeURIComponent(start.state)}`, { cookie: start.cookie });
  }
  const passwordHash = await PasswordUtil.hash('Strong1!');
  const admin = await User.create({ emailVerifiedAt: new Date(), fullName: 'QC Admin', email: 'qcadmin@test.edu', role: 'admin', passwordHash });
  const learner = await User.create({ emailVerifiedAt: new Date(), fullName: 'QC Learner', email: 'qclearner@test.edu', passwordHash });
  const adminToken = JWTUtil.createAccessToken(admin);

  await t.test('register, verify OTP and login normalize data and reject OTP replay or duplicate email', async () => {
    const body = { fullName: 'QC Student', email: ' REGISTER@test.edu ', phone: '0912345678', password: 'Strong1!', confirmPassword: 'Strong1!' };
    const res = await request('/api/auth/register', { method: 'POST', body });
    assert.equal(res.status, 202); assert.equal(await User.countDocuments({ email: 'register@test.edu' }), 0);
    const pending = await OtpVerification.findOne({ email: 'register@test.edu' });
    assert.notEqual(pending.otpHash, delivered.get('register@test.edu'));
    assert.notEqual(pending.payload.passwordHash, body.password);
    assert.equal((await request('/api/auth/verify-otp', { method: 'POST', body: { email: 'register@test.edu', otp: 'wrong' } })).status, 400);
    const verified = await request('/api/auth/verify-otp', { method: 'POST', body: { email: ' REGISTER@test.edu ', otp: delivered.get('register@test.edu') } });
    assert.equal(verified.status, 201); assert.equal(verified.data.user.role, 'student'); assert.equal(verified.data.user.passwordHash, undefined);
    assert.equal((await request('/api/auth/verify-otp', { method: 'POST', body: { email: 'register@test.edu', otp: delivered.get('register@test.edu') } })).status, 400);
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'register@test.edu', password: 'Strong1!' } })).status, 200);
    assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 409);
  });

  await t.test('register cannot bypass the resend cooldown by submitting the same form again', async () => {
    const body = { fullName: 'Cooldown Student', email: 'cooldown@test.edu', phone: '0912345678', password: 'Strong1!', confirmPassword: 'Strong1!' };
    assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 202);
    const firstOtp = delivered.get(body.email);
    assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 429);
    assert.equal(delivered.get(body.email), firstOtp);
    assert.equal((await request('/api/auth/resend-otp', { method: 'POST', body: { email: body.email } })).status, 429);
  });

  await t.test('expired OTP can be resent, and SMTP failure clears the pending registration', async () => {
    const email = 'resendqc@test.edu';
    const body = { fullName: 'Resend Student', email, phone: '0912345678', password: 'Strong1!', confirmPassword: 'Strong1!' };
    assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 202);
    const oldOtp = delivered.get(email);
    await OtpVerification.updateOne({ email }, { otpExpiresAt: new Date(Date.now() - 1000), resendAvailableAt: new Date(Date.now() - 1000) });
    assert.equal((await request('/api/auth/verify-otp', { method: 'POST', body: { email, otp: oldOtp } })).status, 400);
    assert.equal((await request('/api/auth/resend-otp', { method: 'POST', body: { email } })).status, 200);
    assert.equal((await request('/api/auth/verify-otp', { method: 'POST', body: { email, otp: delivered.get(email) } })).status, 201);
    EmailUtil.sendOtp = async () => { throw new Error('QC SMTP failure'); };
    try {
      assert.equal((await request('/api/auth/register', { method: 'POST', body: { ...body, email: 'failedqc@test.edu' } })).status, 500);
      assert.equal(await OtpVerification.countDocuments({ email: 'failedqc@test.edu' }), 0);
    } finally { EmailUtil.sendOtp = async (address, otp) => { delivered.set(address, otp); }; }
  });

  await t.test('concurrent registration cannot issue multiple codes during one cooldown', async () => {
    const body = { fullName: 'Concurrent Student', email: 'concurrentqc@test.edu', phone: '0912345678', password: 'Strong1!', confirmPassword: 'Strong1!' };
    const results = await Promise.all([1, 2].map(() => request('/api/auth/register', { method: 'POST', body })));
    assert.deepEqual(results.map((res) => res.status).sort(), [202, 429]);
    assert.equal(await OtpVerification.countDocuments({ email: body.email }), 1);
  });

  await t.test('OAuth callback rejects missing, mismatched and malformed state cookies before provider exchange', async () => {
    const start = await beginGoogle();
    const before = exchanges;
    for (const cookie of [undefined, 'ai_lms_oauth_state=other-state', 'ai_lms_oauth_state=%E0%A4%A']) {
      const res = await request(`/api/auth/google/callback?code=provider-test-code&state=${encodeURIComponent(start.state)}`, { cookie });
      assert.equal(res.status, 302); assert.ok(new URL(res.location).searchParams.has('error')); assert.equal(new URL(res.location).searchParams.has('code'), false);
    }
    assert.equal(exchanges, before);
  });

  await t.test('OAuth refuses an untrusted redirect origin and cookies cover both API aliases', async () => {
    assert.equal((await request('/api/auth/google?origin=https://untrusted.example')).status, 400);
    const start = await beginGoogle('/api/v1/auth');
    assert.match(start.rawCookie, /Path=\/api(?:;|$)/);
    assert.match(start.rawCookie, /HttpOnly/); assert.match(start.rawCookie, /SameSite=Lax/);
    const res = await callback(start, '/api/v1/auth');
    assert.equal(res.status, 302); assert.equal(new URL(res.location).origin, 'http://localhost:5173');
  });

  await t.test('Google login links the verified identity and the exchange ticket is single-use', async () => {
    profile = { sub: 'google-single-use', email: 'singleuse@test.edu', name: 'Google Student', email_verified: true };
    await User.create({ fullName: profile.name, email: profile.email, passwordHash, emailVerifiedAt: new Date() });
    const res = await callback(await beginGoogle());
    const code = new URL(res.location).searchParams.get('code'); assert.ok(code);
    const login = await request('/api/auth/google/exchange', { method: 'POST', body: { code } });
    assert.equal(login.status, 200); assert.equal(login.data.user.email, profile.email); assert.equal(login.data.user.passwordHash, undefined);
    assert.ok(login.data.accessToken); assert.ok(login.data.refreshToken);
    assert.ok(await OAuthAccount.exists({ userId: login.data.user.id, providerAccountId: profile.sub }));
    assert.equal((await request('/api/auth/google/exchange', { method: 'POST', body: { code } })).status, 400);
  });

  await t.test('unknown Google email redirects to registration without creating accounts, links or tickets', async () => {
    profile = { sub: 'google-unregistered', email: ' Unknown@test.edu ', email_verified: true };
    const usersBefore = await User.countDocuments();
    const linksBefore = await OAuthAccount.countDocuments();
    const ticketsBefore = await OAuthLoginTicket.countDocuments();
    const res = await callback(await beginGoogle());
    const redirect = new URL(res.location);
    assert.equal(res.status, 302);
    assert.equal(redirect.pathname, '/register');
    assert.equal(redirect.searchParams.get('reason'), 'google_registration_required');
    assert.equal(redirect.searchParams.get('email'), 'unknown@test.edu');
    assert.equal(redirect.searchParams.has('code'), false);
    assert.equal(await User.countDocuments(), usersBefore);
    assert.equal(await OAuthAccount.countDocuments(), linksBefore);
    assert.equal(await OAuthLoginTicket.countDocuments(), ticketsBefore);
  });

  await t.test('Google cannot bypass an in-progress email/password registration', async () => {
    const email = 'googlepending@test.edu';
    const body = { fullName: 'Pending Student', email, phone: '0912345678', password: 'Strong1!', confirmPassword: 'Strong1!' };
    assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 202);
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email, password: body.password } })).status, 401);
    profile = { sub: 'google-pending-registration', email, email_verified: true };
    assert.equal(new URL((await callback(await beginGoogle())).location).pathname, '/register');
    assert.equal(await User.countDocuments({ email }), 0);
    assert.equal(await OAuthAccount.countDocuments({ providerAccountId: profile.sub }), 0);
    assert.ok(await OtpVerification.exists({ email }));
    assert.equal((await request('/api/auth/verify-otp', { method: 'POST', body: { email, otp: delivered.get(email) } })).status, 201);
    assert.ok(new URL((await callback(await beginGoogle())).location).searchParams.get('code'));
    assert.equal(await User.countDocuments({ email }), 1);
  });

  await t.test('pending and active but unverified users cannot login, refresh, use access or exchange Google tickets', async () => {
    for (const status of ['pending', 'active']) {
      const user = await User.create({ fullName: 'Unverified Student', email: `${status}unverified@test.edu`, passwordHash, status });
      profile = { sub: `google-${status}-unverified`, email: user.email, email_verified: true };
      const res = await callback(await beginGoogle());
      assert.equal(new URL(res.location).pathname, '/login');
      assert.match(new URL(res.location).searchParams.get('error'), /verify your email/);
      assert.equal((await User.findById(user._id)).status, status);
      assert.equal((await User.findById(user._id)).emailVerifiedAt, null);
      assert.equal(await OAuthAccount.countDocuments({ userId: user._id }), 0);
      assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'Strong1!' } })).status, 403);
      const session = await require('../../src/composition/http').controllers.AuthController.createSession(user);
      assert.equal((await request('/api/student/profile', { token: session.accessToken })).status, 403);
      assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: session.refreshToken } })).status, 403);
      const code = await OAuthLoginTicketRepository.create(user._id);
      assert.equal((await request('/api/auth/google/exchange', { method: 'POST', body: { code } })).status, 403);
      await request('/api/auth/request-password-reset', { method: 'POST', body: { email: user.email } });
      assert.equal(resetLinks.has(user.email), false);
      assert.ok(delivered.get(user.email));
      assert.equal((await request('/api/auth/verify-otp', { method: 'POST', body: { email: user.email, otp: delivered.get(user.email) } })).status, 200);
      assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'Strong1!' } })).status, 200);
      assert.equal(await User.countDocuments({ email: user.email }), 1);
      assert.equal((await User.findById(user._id)).role, user.role);
    }
  });

  await t.test('concurrent OTP verification creates exactly one verified account', async () => {
    const email = 'verifyrace@test.edu';
    const body = { fullName: 'Concurrent Verification', email, phone: '0912345678', password: 'Strong1!', confirmPassword: 'Strong1!' };
    assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 202);
    const results = await Promise.all([1, 2].map(() => request('/api/auth/verify-otp', { method: 'POST', body: { email, otp: delivered.get(email) } })));
    assert.equal(results.filter((res) => res.status === 201).length, 1);
    assert.ok(results.every((res) => [201, 400, 409].includes(res.status)));
    assert.equal(await User.countDocuments({ email }), 1);
    assert.ok((await User.findOne({ email })).emailVerifiedAt);
  });

  await t.test('a Google provider identity cannot be reassigned to another account', async () => {
    const email = 'othergoogle@test.edu';
    const other = await User.create({ fullName: 'Other Google', email, passwordHash, emailVerifiedAt: new Date() });
    const link = await OAuthAccount.findOne({ providerAccountId: 'google-single-use' });
    profile = { sub: 'google-single-use', email, email_verified: true };
    const res = await callback(await beginGoogle());
    assert.ok(new URL(res.location).searchParams.get('error'));
    assert.equal(String((await OAuthAccount.findById(link._id)).userId), String(link.userId));
    assert.equal(await OAuthLoginTicket.countDocuments({ userId: other._id }), 0);
  });

  await t.test('OAuth ticket expiry/concurrency and locked/unverified Google identities are rejected', async () => {
    const code = await OAuthLoginTicketRepository.create(learner._id);
    const concurrent = await Promise.all([1, 2].map(() => request('/api/auth/google/exchange', { method: 'POST', body: { code } })));
    assert.deepEqual(concurrent.map((res) => res.status).sort(), [200, 400]);
    const expired = await OAuthLoginTicketRepository.create(learner._id);
    await OAuthLoginTicket.updateOne({ codeHash: OAuthLoginTicketRepository.hash(expired) }, { expiresAt: new Date(Date.now() - 1000) });
    assert.equal((await request('/api/auth/google/exchange', { method: 'POST', body: { code: expired } })).status, 400);
    for (const body of [{}, { code: {} }, { code: 'invalid' }]) assert.equal((await request('/api/auth/google/exchange', { method: 'POST', body })).status, 400);
    await User.updateOne({ _id: learner._id }, { status: 'inactive' });
    profile = { sub: 'google-locked', email: learner.email, name: learner.fullName, email_verified: true };
    assert.ok(new URL((await callback(await beginGoogle())).location).searchParams.has('error'));
    profile = { sub: 'google-unverified', email: 'unverifiedqc@test.edu', name: 'Unverified Student', email_verified: false };
    assert.ok(new URL((await callback(await beginGoogle())).location).searchParams.has('error'));
    assert.equal(await User.countDocuments({ email: profile.email }), 0);
    await User.updateOne({ _id: learner._id }, { status: 'active' });
  });

  await t.test('admin changing email invalidates old reset links and existing sessions', async () => {
    const session = (await request('/api/auth/login', { method: 'POST', body: { email: learner.email, password: 'Strong1!' } })).data;
    assert.equal((await request('/api/auth/request-password-reset', { method: 'POST', body: { email: learner.email } })).status, 200);
    const token = resetLinks.get(learner.email); assert.ok(token);
    assert.equal((await request(`/api/admin/users/${learner._id}`, { method: 'PATCH', token: adminToken, body: { email: 'newqclearner@test.edu' } })).status, 200);
    assert.equal((await request('/api/auth/reset-password', { method: 'POST', body: { token, newPassword: 'Changed1!', confirmPassword: 'Changed1!' } })).status, 400);
    assert.equal((await request('/api/student/profile', { token: session.accessToken })).status, 401);
    assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: session.refreshToken } })).status, 401);
    const login = await request('/api/auth/login', { method: 'POST', body: { email: 'newqclearner@test.edu', password: 'Strong1!' } });
    assert.equal(login.status, 403);
    assert.equal(login.errors.requiresEmailVerification, true);
    assert.equal((await request('/api/auth/verify-otp', { method: 'POST', body: { email: 'newqclearner@test.edu', otp: delivered.get('newqclearner@test.edu') } })).status, 200);
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'newqclearner@test.edu', password: 'Strong1!' } })).status, 200);
  });

  await t.test('every defined role can view its own account through the existing profile API', async () => {
    for (const role of ['student', 'teacher', 'admin']) {
      const user = await User.create({ emailVerifiedAt: new Date(), fullName: 'View Account', email: `${role}viewqc@test.edu`, role });
      const res = await request('/api/student/profile', { token: JWTUtil.createAccessToken(user) });
      assert.equal(res.status, 200); assert.equal(res.data.profile.email, user.email); assert.equal(res.data.profile.passwordHash, undefined);
    }
  });
});
