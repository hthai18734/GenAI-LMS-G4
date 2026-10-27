const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../../src/model/identity/User');
const Course = require('../../src/model/learning/Course');
const Review = require('../../src/model/engagement/Review');
const Enrollment = require('../../src/model/learning/Enrollment');
const RefreshSession = require('../../src/model/identity/RefreshSession');
const PasswordUtil = require('../../src/utils/auth/PasswordUtil');
const JWTUtil = require('../../src/utils/auth/JWTUtil');
const { app } = require('../../src/index');

test('account, user and review use cases with MongoDB', { skip: !process.env.TEST_MONGODB_URI }, async (t) => {
  const oldSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = 'user-review-integration-secret';
  await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName: `ai_lms_test_${crypto.randomBytes(8).toString('hex')}` });
  await Promise.all([User.init(), Review.init(), Course.init(), Enrollment.init(), RefreshSession.init()]);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (oldSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = oldSecret;
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', body, token } = {}) {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, ...(await response.json()) };
  }
  const passwordHash = await PasswordUtil.hash('Strong1!');
  const admin = await User.create({ emailVerifiedAt: new Date(), fullName: 'Admin User', email: 'admin@test.edu', role: 'admin', passwordHash });
  const student = await User.create({ emailVerifiedAt: new Date(), fullName: 'Student User', email: 'student@test.edu', passwordHash });
  const otherStudent = await User.create({ emailVerifiedAt: new Date(), fullName: 'Other Student', email: 'other@test.edu', passwordHash });
  const teacher = await User.create({ emailVerifiedAt: new Date(), fullName: 'Teacher User', email: 'teacher@test.edu', role: 'teacher', passwordHash });
  const otherTeacher = await User.create({ emailVerifiedAt: new Date(), fullName: 'Other Teacher', email: 'otherteacher@test.edu', role: 'teacher', passwordHash });
  const pending = await User.create({ emailVerifiedAt: new Date(), fullName: 'Pending User', email: 'pending@test.edu', status: 'pending' });
  const tokens = { admin: JWTUtil.createAccessToken(admin), student: JWTUtil.createAccessToken(student), otherStudent: JWTUtil.createAccessToken(otherStudent), teacher: JWTUtil.createAccessToken(teacher), otherTeacher: JWTUtil.createAccessToken(otherTeacher) };
  const course = await Course.create({ title: 'Review course', teacherId: teacher._id, status: 'PUBLIC' });
  const draft = await Course.create({ title: 'Draft course', teacherId: teacher._id });
  await Enrollment.create([
    { userId: student._id, courseId: course._id, status: 'active' },
    { userId: otherStudent._id, courseId: course._id, status: 'active' },
  ]);
  const validUser = { fullName: 'Created User', email: 'created@test.edu', password: 'Strong1!', role: 'student' };
  let createdId;
  let reviewId;
  let secondReviewId;

  await t.test('user APIs require admin permissions for reads and writes', async () => {
    for (const method of ['GET', 'POST']) assert.equal((await request('/api/admin/users', { method, body: method === 'POST' ? validUser : undefined })).status, 401);
    for (const token of [tokens.student, tokens.teacher]) {
      for (const [method, path, body] of [['GET', '/api/admin/users'], ['POST', '/api/admin/users', validUser], ['GET', `/api/admin/users/${student._id}`], ['PATCH', `/api/admin/users/${student._id}`, { fullName: 'Changed Name' }], ['DELETE', `/api/admin/users/${student._id}`], ['PATCH', `/api/admin/users/${student._id}/role`, { role: 'admin' }], ['PATCH', `/api/admin/users/${student._id}/status`, { status: 'inactive' }]]) {
        assert.equal((await request(path, { method, body, token })).status, 403);
      }
    }
  });

  await t.test('admin creates a user without exposing password/reset data; duplicates conflict', async () => {
    const res = await request('/api/admin/users', { method: 'POST', token: tokens.admin, body: { ...validUser, email: ' CREATED@test.edu ' } });
    assert.equal(res.status, 201); createdId = res.data.user._id;
    assert.equal(res.data.user.email, validUser.email);
    assert.equal(res.data.user.passwordHash, undefined);
    assert.equal(res.data.user.passwordResetHash, undefined);
    assert.equal(res.data.user.status, 'active');
    assert.ok(await PasswordUtil.compare(validUser.password, (await User.findById(createdId).select('+passwordHash')).passwordHash));
    assert.equal((await request('/api/admin/users', { method: 'POST', token: tokens.admin, body: validUser })).status, 409);
    for (const body of [{}, { ...validUser, password: 'weak' }, { ...validUser, role: 'owner' }, { ...validUser, email: {} }, { ...validUser, status: 'active' }]) assert.equal((await request('/api/admin/users', { method: 'POST', token: tokens.admin, body })).status, 400);
  });

  await t.test('account search and filters share the user list and correct pagination total', async () => {
    let res = await request('/api/admin/users?search=STUDENT&role=student&status=active&limit=1&page=2', { token: tokens.admin });
    assert.equal(res.status, 200); assert.equal(res.data.users.length, 1); assert.equal(res.data.pagination.total, 2); assert.equal(res.data.pagination.page, 2);
    res = await request('/api/admin/users?search=.*', { token: tokens.admin });
    assert.equal(res.data.pagination.total, 0);
    assert.equal((await request('/api/admin/users?role=owner', { token: tokens.admin })).status, 400);
    assert.equal((await request('/api/admin/users?status=deleted', { token: tokens.admin })).status, 400);
    res = await request('/api/v1/admin/users?status=pending', { token: tokens.admin });
    assert.equal(res.data.users[0]._id, String(pending._id));
  });

  await t.test('account/user detail and update validate IDs, existence, email uniqueness and allowed fields', async () => {
    let res = await request(`/api/admin/users/${createdId}`, { token: tokens.admin });
    assert.equal(res.status, 200); assert.equal(res.data.user.passwordHash, undefined);
    res = await request(`/api/admin/users/${createdId}`, { method: 'PATCH', token: tokens.admin, body: { fullName: 'Updated User', email: ' UPDATED@test.edu ', phone: '0912345678' } });
    assert.equal(res.status, 200); assert.equal(res.data.user.email, 'updated@test.edu'); assert.equal(res.data.user.phone, '0912345678');
    assert.equal((await request(`/api/admin/users/${createdId}`, { method: 'PATCH', token: tokens.admin, body: { email: student.email } })).status, 409);
    for (const body of [{}, { role: 'admin' }, { passwordHash: 'spoofed' }, { phone: {} }]) assert.equal((await request(`/api/admin/users/${createdId}`, { method: 'PATCH', token: tokens.admin, body })).status, 400);
    assert.equal((await request('/api/admin/users/bad', { token: tokens.admin })).status, 400);
    assert.equal((await request(`/api/admin/users/${new mongoose.Types.ObjectId()}`, { token: tokens.admin })).status, 404);
  });

  await t.test('change role and status revoke sessions while keeping existing admin/pending restrictions', async (t) => {
    let otp;
    t.mock.method(require('../../src/utils/email/EmailUtil'), 'sendOtp', async (email, code) => { otp = code; });
    const verification = await request('/api/auth/login', { method: 'POST', body: { email: 'updated@test.edu', password: 'Strong1!' } });
    assert.equal(verification.status, 403);
    assert.equal(verification.errors.requiresEmailVerification, true);
    assert.equal((await request('/api/auth/verify-otp', { method: 'POST', body: { email: 'updated@test.edu', otp } })).status, 200);
    const session = (await request('/api/auth/login', { method: 'POST', body: { email: 'updated@test.edu', password: 'Strong1!' } })).data;
    assert.equal((await request(`/api/admin/users/${createdId}/role`, { method: 'PATCH', token: tokens.admin, body: { role: 'owner' } })).status, 400);
    assert.equal((await request(`/api/admin/users/${createdId}/role`, { method: 'PATCH', token: tokens.admin, body: { role: 'teacher' } })).status, 200);
    assert.equal((await request('/api/student/profile', { token: session.accessToken })).status, 401);
    assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: session.refreshToken } })).status, 401);
    assert.equal((await request(`/api/admin/users/${createdId}/status`, { method: 'PATCH', token: tokens.admin, body: { status: 'inactive' } })).status, 200);
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'updated@test.edu', password: 'Strong1!' } })).status, 403);
    assert.equal((await request(`/api/admin/users/${createdId}/status`, { method: 'PATCH', token: tokens.admin, body: { status: 'active' } })).status, 200);
    assert.equal((await request(`/api/admin/users/${pending._id}/status`, { method: 'PATCH', token: tokens.admin, body: { status: 'active' } })).status, 409);
    assert.equal((await request(`/api/admin/users/${admin._id}/status`, { method: 'PATCH', token: tokens.admin, body: { status: 'inactive' } })).status, 403);
    assert.equal((await request(`/api/admin/users/${admin._id}/role`, { method: 'PATCH', token: tokens.admin, body: { role: 'student' } })).status, 403);
  });

  await t.test('review creation derives author from login, validates input and requires a public course', async () => {
    const path = `/api/student/courses/${course._id}/reviews`;
    assert.equal((await request(path, { method: 'POST', body: { rating: 5, content: 'Great course' } })).status, 401);
    assert.equal((await request(path, { method: 'POST', token: tokens.teacher, body: { rating: 5, content: 'Great course' } })).status, 403);
    for (const body of [{ rating: 6, content: 'Great' }, { rating: 3.5, content: 'Great' }, { rating: '5', content: 'Great' }, { rating: 5, content: '' }, { rating: 5, content: 'Great', userId: otherStudent._id }]) assert.equal((await request(path, { method: 'POST', token: tokens.student, body })).status, 400);
    assert.equal((await request(`/api/student/courses/${draft._id}/reviews`, { method: 'POST', token: tokens.student, body: { rating: 5, content: 'Great' } })).status, 404);
    const first = await request(path, { method: 'POST', token: tokens.student, body: { rating: 5, content: 'Great course' } });
    assert.equal(first.status, 201); reviewId = first.data.review._id;
    assert.equal(first.data.review.userId._id, String(student._id));
    const second = await request(path, { method: 'POST', token: tokens.otherStudent, body: { rating: 3, content: 'Helpful examples' } });
    assert.equal(second.status, 201); secondReviewId = second.data.review._id;
    assert.equal((await Course.findById(course._id)).averageRating, 4);
  });

  await t.test('public review list/detail/search and pagination expose visible public reviews only', async () => {
    let res = await request(`/api/public/courses/${course._id}/reviews?search=great&limit=1`);
    assert.equal(res.status, 200); assert.equal(res.data.pagination.total, 1); assert.equal(res.data.reviews[0]._id, reviewId);
    res = await request(`/api/v1/public/reviews/${reviewId}`);
    assert.equal(res.status, 200); assert.equal(res.data.review.userId.email, undefined);
    assert.equal((await request(`/api/public/courses/${draft._id}/reviews`)).status, 404);
    assert.equal((await request('/api/public/reviews/bad')).status, 400);
    assert.equal((await request(`/api/public/reviews/${new mongoose.Types.ObjectId()}`)).status, 404);
  });

  await t.test('students update only their own reviews and list their own hidden/visible records', async () => {
    const path = `/api/student/reviews/${reviewId}`;
    assert.equal((await request(path, { method: 'PATCH', token: tokens.otherStudent, body: { rating: 1, content: 'Changed' } })).status, 403);
    assert.equal((await request(path, { token: tokens.otherStudent })).status, 403);
    const res = await request(path, { method: 'PATCH', token: tokens.student, body: { rating: 4, content: 'Updated feedback' } });
    assert.equal(res.status, 200); assert.equal(res.data.review.rating, 4);
    assert.equal((await Course.findById(course._id)).averageRating, 3.5);
    const list = await request('/api/student/reviews', { token: tokens.student });
    assert.equal(list.data.pagination.total, 1); assert.equal(list.data.reviews[0]._id, reviewId);
  });

  await t.test('teacher review list and replies enforce course ownership', async () => {
    const path = `/api/teacher/reviews/${reviewId}/reply`;
    assert.equal((await request(path, { method: 'POST', token: tokens.otherTeacher, body: { content: 'Spoofed reply' } })).status, 403);
    assert.equal((await request(path, { method: 'POST', token: tokens.student, body: { content: 'Spoofed reply' } })).status, 403);
    assert.equal((await request(path, { method: 'POST', token: tokens.teacher, body: { content: ' ' } })).status, 400);
    let res = await request(path, { method: 'POST', token: tokens.teacher, body: { content: 'Thank you for your feedback' } });
    assert.equal(res.status, 200); assert.equal(res.data.review.reply.userId._id, String(teacher._id));
    res = await request(path, { method: 'POST', token: tokens.teacher, body: { content: 'Updated teacher reply' } });
    assert.equal(res.data.review.reply.content, 'Updated teacher reply');
    assert.equal((await request(`/api/teacher/reviews/${reviewId}`, { token: tokens.otherTeacher })).status, 403);
    assert.equal((await request('/api/teacher/reviews', { token: tokens.otherTeacher })).data.pagination.total, 0);
    assert.equal((await request('/api/teacher/reviews?search=feedback', { token: tokens.teacher })).data.pagination.total, 1);
  });

  await t.test('admin moderation hides list/detail, preserves hidden status on edits and updates rating', async () => {
    const path = `/api/admin/reviews/${reviewId}/status`;
    assert.equal((await request(path, { method: 'PATCH', token: tokens.teacher, body: { status: 'hidden' } })).status, 403);
    assert.equal((await request(path, { method: 'PATCH', token: tokens.admin, body: { status: 'bad' } })).status, 400);
    assert.equal((await request(path, { method: 'PATCH', token: tokens.admin, body: { status: 'hidden' } })).status, 200);
    assert.equal((await request(`/api/public/reviews/${reviewId}`)).status, 404);
    assert.equal((await request(`/api/public/courses/${course._id}/reviews?status=hidden`)).data.pagination.total, 1);
    assert.equal((await Course.findById(course._id)).averageRating, 3);
    assert.equal((await request('/api/admin/reviews?search=feedback&status=hidden', { token: tokens.admin })).data.pagination.total, 1);
    assert.equal((await request(`/api/student/reviews/${reviewId}`, { method: 'PATCH', token: tokens.student, body: { rating: 5, content: 'Hidden edited feedback' } })).data.review.status, 'hidden');
    assert.equal((await request('/api/student/reviews?status=hidden', { token: tokens.student })).data.pagination.total, 1);
    assert.equal((await request(path, { method: 'PATCH', token: tokens.admin, body: { status: 'visible' } })).status, 200);
    assert.equal((await Course.findById(course._id)).averageRating, 4);
    assert.equal((await request(`/api/admin/reviews/${secondReviewId}/status`, { method: 'PATCH', token: tokens.admin, body: { status: 'hidden' } })).status, 200);
    assert.equal((await request(path, { method: 'PATCH', token: tokens.admin, body: { status: 'hidden' } })).status, 200);
    assert.equal((await Course.findById(course._id)).averageRating, 0);
  });

  await t.test('user deletion removes login/detail/list access and revokes refresh sessions', async () => {
    const session = (await request('/api/auth/login', { method: 'POST', body: { email: 'updated@test.edu', password: 'Strong1!' } })).data;
    assert.equal((await request(`/api/admin/users/${admin._id}`, { method: 'DELETE', token: tokens.admin })).status, 403);
    assert.equal((await request(`/api/admin/users/${createdId}`, { method: 'DELETE', token: tokens.admin })).status, 200);
    assert.equal(await User.findById(createdId), null);
    assert.equal(await RefreshSession.countDocuments({ userId: createdId }), 0);
    assert.equal((await request(`/api/admin/users/${createdId}`, { token: tokens.admin })).status, 404);
    assert.equal((await request('/api/admin/users?search=updated@test.edu', { token: tokens.admin })).data.pagination.total, 0);
    assert.equal((await request('/api/student/profile', { token: session.accessToken })).status, 401);
    assert.equal((await request('/api/auth/refresh-token', { method: 'POST', body: { refreshToken: session.refreshToken } })).status, 401);
    assert.equal((await request(`/api/admin/users/${createdId}`, { method: 'DELETE', token: tokens.admin })).status, 404);
  });
});
