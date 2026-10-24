const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../src/model/identity/User');
const RefreshSession = require('../../src/model/identity/RefreshSession');
const PasswordUtil = require('../../src/utils/auth/PasswordUtil');
const EmailUtil = require('../../src/utils/email/EmailUtil');
const JWTUtil = require('../../src/utils/auth/JWTUtil');
const { app } = require('../../src/index');

test('authentication and account locking with MongoDB', { skip: !process.env.TEST_MONGODB_URI }, async (t) => {
  const oldSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = 'integration-test-secret';
  const databaseName = `ai_lms_test_${crypto.randomBytes(8).toString('hex')}`;
  await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName: databaseName });
  await Promise.all([User.init(), RefreshSession.init()]);
  const originalEmail = EmailUtil.sendPasswordReset;
  const delivered = [];
  EmailUtil.sendPasswordReset = async (email, url) => { delivered.push({ email, token: new URL(url).searchParams.get('token') }); };
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    EmailUtil.sendPasswordReset = originalEmail;
    if (oldSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = oldSecret;
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', body, token } = {}) {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, ...(await response.json()) };
  }
  async function login(email, password = 'Strong1!') {
    const res = await request('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(res.status, 200);
    assert.ok(res.data.accessToken);
    assert.ok(res.data.refreshToken);
    assert.equal(res.data.user.passwordHash, undefined);
    return res.data;
  }
  const passwordHash = await PasswordUtil.hash('Strong1!');
  const admin = await User.create({ emailVerifiedAt: new Date(), fullName: 'Admin User', email: 'admin@test.edu', passwordHash, role: 'admin' });
  const student = await User.create({ emailVerifiedAt: new Date(), fullName: 'Student User', email: 'student@test.edu', passwordHash });
  const teacher = await User.create({ emailVerifiedAt: new Date(), fullName: 'Teacher User', email: 'teacher@test.edu', passwordHash, role: 'teacher' });
  const pending = await User.create({ emailVerifiedAt: new Date(), fullName: 'Pending User', email: 'pending@test.edu', passwordHash, status: 'pending' });
  let adminSession = await login(admin.email);
  let studentSession = await login(student.email);
  let teacherSession = await login(teacher.email);

  await t.test('role authorization rejects anonymous, student and teacher access', async () => {
    assert.equal((await request('/api/admin/users', {})).status, 401);

    for (const session of [studentSession, teacherSession]) assert.equal((await request('/api/admin/users', { token: session.accessToken })).status, 403);
    assert.equal((await request('/api/auth/change-password', { method: 'POST', body: {} })).status, 401);
  });

  await t.test('refresh rotates tokens, rejects replay, wrong type, invalid, expired and missing users', async () => {
    const old = studentSession;
    let res = await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: old.refreshToken } });
    assert.equal(res.status, 200); assert.notEqual(res.data.refreshToken, old.refreshToken); studentSession = res.data;
    assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: old.refreshToken } })).status, 401);
    for (const refreshToken of [undefined, 'invalid', old.accessToken, jwt.sign({ type: 'refresh', sub: String(student._id) }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1 }), JWTUtil.createRefreshToken({ _id: new mongoose.Types.ObjectId() }, new mongoose.Types.ObjectId())]) {
      assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken } })).status, 401);
    }
    assert.equal((await request('/api/admin/users', { token: studentSession.refreshToken })).status, 401);
    const expiredAccess = jwt.sign({ type: 'access', sub: String(admin._id) }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1 });
    assert.equal((await request('/api/admin/users', { token: expiredAccess })).status, 401);
    assert.equal((await request('/api/admin/users', { token: 'invalid' })).status, 401);
    const missingAccess = JWTUtil.createAccessToken({ _id: new mongoose.Types.ObjectId(), role: 'admin' });
    assert.equal((await request('/api/admin/users', { token: missingAccess })).status, 401);
    const racing = await login(student.email);
    const responses = await Promise.all([1, 2].map(() => request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: racing.refreshToken } })));
    assert.deepEqual(responses.map((res) => res.status).sort(), [200, 401]);
    await RefreshSession.updateOne({ _id: JWTUtil.verifyRefreshToken(responses.find((res) => res.status === 200).data.refreshToken).sid }, { expiresAt: new Date(Date.now() - 1000) });
    assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: responses.find((res) => res.status === 200).data.refreshToken } })).status, 401);
  });

  await t.test('locking blocks existing access, refresh and login; unlocking requires a new login', async () => {
    const url = `/api/admin/users/${teacher._id}/status`;
    assert.equal((await request(url, { method: 'PATCH', token: studentSession.accessToken, body: { status: 'inactive' } })).status, 403);
    assert.equal((await request(url, { method: 'PATCH', token: adminSession.accessToken, body: { status: 'inactive' } })).status, 200);
    assert.equal((await request('/api/auth/change-password', { method: 'POST', token: teacherSession.accessToken, body: {} })).status, 403);
    assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: teacherSession.refreshToken } })).status, 403);
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: teacher.email, password: 'Strong1!' } })).status, 403);
    assert.equal((await request('/api/auth/request-password-reset', { method: 'POST', body: { email: teacher.email } })).status, 200);
    assert.equal(delivered.length, 0);
    assert.equal((await request(url, { method: 'PATCH', token: adminSession.accessToken, body: { status: 'active' } })).status, 200);
    assert.equal((await request('/api/auth/change-password', { method: 'POST', token: teacherSession.accessToken, body: {} })).status, 401);
    teacherSession = await login(teacher.email);
    assert.equal((await request(`/api/admin/users/${admin._id}/status`, { method: 'PATCH', token: adminSession.accessToken, body: { status: 'inactive' } })).status, 403);
    assert.equal((await request(`/api/admin/users/${pending._id}/status`, { method: 'PATCH', token: adminSession.accessToken, body: { status: 'active' } })).status, 409);
    assert.equal((await request('/api/admin/users/bad/status', { method: 'PATCH', token: adminSession.accessToken, body: { status: 'inactive' } })).status, 400);
    assert.equal((await request(`/api/admin/users/${new mongoose.Types.ObjectId()}/status`, { method: 'PATCH', token: adminSession.accessToken, body: { status: 'inactive' } })).status, 404);
    assert.equal((await request(url, { method: 'PATCH', token: adminSession.accessToken, body: { status: 'locked' } })).status, 400);
    const users = await request('/api/admin/users', { token: adminSession.accessToken });
    assert.equal(users.status, 200); assert.equal(users.data.users.length, 4); assert.equal(users.data.users[0].passwordHash, undefined);
  });

  await t.test('request reset validates email, conceals missing users, throttles resend and stores only hashes', async () => {
    for (const email of ['invalid', {}, []]) assert.equal((await request('/api/auth/request-password-reset', { method: 'POST', body: { email } })).status, 400);
    const missing = await request('/api/auth/request-password-reset', { method: 'POST', body: { email: 'missing@test.edu' } });
    const active = await request('/api/auth/request-password-reset', { method: 'POST', body: { email: ` ${student.email.toUpperCase()} ` } });
    assert.equal(missing.status, 200); assert.equal(active.message, missing.message); assert.equal(delivered.length, 1);
    const saved = await User.findById(student._id).select('+passwordResetHash +passwordResetExpiresAt');
    assert.notEqual(saved.passwordResetHash, delivered[0].token);
    assert.equal(saved.passwordResetHash, crypto.createHash('sha256').update(delivered[0].token).digest('hex'));
    assert.ok(saved.passwordResetExpiresAt > new Date());
    assert.equal((await request('/api/auth/request-password-reset', { method: 'POST', body: { email: student.email } })).status, 200);
    assert.equal(delivered.length, 1);
    assert.equal((await User.findById(student._id).lean()).passwordResetHash, undefined);
  });

  await t.test('reset rejects invalid, expired, weak and mismatched input then consumes the token once', async () => {
    const token = delivered[0].token;
    const body = { token, newPassword: 'Changed1!', confirmPassword: 'Changed1!' };
    for (const invalid of [{ ...body, token: 'bad' }, { ...body, token: 'f'.repeat(64) }, { ...body, newPassword: 'weak' }, { ...body, newPassword: {} }, { ...body, confirmPassword: 'Different1!' }]) assert.equal((await request('/api/auth/reset-password', { method: 'POST', body: invalid })).status, 400);
    await User.updateOne({ _id: student._id }, { passwordResetExpiresAt: new Date(Date.now() - 1000) });
    assert.equal((await request('/api/auth/reset-password', { method: 'POST', body })).status, 400);
    await User.updateOne({ _id: student._id }, { passwordResetExpiresAt: new Date(Date.now() + 60_000) });
    const responses = await Promise.all([request('/api/auth/reset-password', { method: 'POST', body }), request('/api/auth/reset-password', { method: 'POST', body })]);
    assert.deepEqual(responses.map((res) => res.status).sort(), [200, 400]);
    assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: studentSession.refreshToken } })).status, 401);
    assert.equal((await request('/api/auth/change-password', { method: 'POST', token: studentSession.accessToken, body: {} })).status, 401);
    studentSession = await login(student.email, 'Changed1!');
    const saved = await User.findById(student._id).select('+passwordHash +passwordResetHash');
    assert.ok(await PasswordUtil.compare('Changed1!', saved.passwordHash)); assert.equal(saved.passwordResetHash, null);
  });

  await t.test('change password verifies current password and invalidates all sessions', async () => {
    const secondSession = await login(student.email, 'Changed1!');
    const body = { currentPassword: 'Changed1!', newPassword: 'Newpass1!', confirmPassword: 'Newpass1!' };
    for (const invalid of [{ ...body, currentPassword: 'Wrong1!' }, { ...body, newPassword: 'weak' }, { ...body, confirmPassword: 'Different1!' }, { ...body, newPassword: 'Changed1!', confirmPassword: 'Changed1!' }]) assert.equal((await request('/api/auth/change-password', { method: 'POST', token: studentSession.accessToken, body: invalid })).status, 400);
    assert.equal((await request('/api/auth/change-password', { method: 'POST', token: studentSession.accessToken, body })).status, 200);
    for (const session of [studentSession, secondSession]) {
      assert.equal((await request('/api/auth/change-password', { method: 'POST', token: session.accessToken, body })).status, 401);
      assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: session.refreshToken } })).status, 401);
    }
    studentSession = await login(student.email, 'Newpass1!');
  });

  await t.test('email delivery failure removes the pending reset and permits retry', async () => {
    EmailUtil.sendPasswordReset = async () => { throw new Error('SMTP unavailable'); };
    assert.equal((await request('/api/auth/request-password-reset', { method: 'POST', body: { email: teacher.email } })).status, 500);
    const saved = await User.findById(teacher._id).select('+passwordResetHash +passwordResetRequestedAt');
    assert.equal(saved.passwordResetHash, null); assert.equal(saved.passwordResetRequestedAt, null);
    EmailUtil.sendPasswordReset = async (email, url) => { delivered.push({ email, token: new URL(url).searchParams.get('token') }); };
    assert.equal((await request('/api/auth/request-password-reset', { method: 'POST', body: { email: teacher.email } })).status, 200);
  });

  await t.test('logout revokes refresh and access for this session', async () => {
    const beforeRefresh = adminSession;
    adminSession = (await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: adminSession.refreshToken } })).data;
    const res = await request('/api/auth/logout', { method: 'POST', body: { refreshToken: beforeRefresh.refreshToken } });
    assert.equal(res.status, 200);
    assert.equal((await request('/api/admin/users', { token: adminSession.accessToken })).status, 401);
    assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: adminSession.refreshToken } })).status, 401);
    adminSession = await login(admin.email);
  });
});
