const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../../src/model/identity/User');
const Course = require('../../src/model/learning/Course');
const Review = require('../../src/model/engagement/Review');
const Notification = require('../../src/model/engagement/Notification');
const ReviewRepository = require('../../src/infrastructure/persistence/mongoose/repositories/engagement/ReviewRepository');
const JWTUtil = require('../../src/utils/auth/JWTUtil');
const { app } = require('../../src/index');

test('Iteration 2 HTTP and MongoDB workflows', { skip: !process.env.TEST_MONGODB_URI }, async t => {
  const secret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = 'iteration-two-test-secret';
  await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName: `ai_lms_i2_test_${crypto.randomBytes(8).toString('hex')}` });
  t.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (secret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = secret;
  });
  await Promise.all([User.init(), Course.init(), Review.init(), Notification.init()]);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const admin = await User.create({ emailVerifiedAt: new Date(), fullName: 'Admin Tester', email: 'admin@i2.test', role: 'admin' });
  const student = await User.create({ emailVerifiedAt: new Date(), fullName: 'Student Tester', email: 'student@i2.test' });
  const other = await User.create({ emailVerifiedAt: new Date(), fullName: 'Other Student', email: 'other@i2.test' });
  const teacher = await User.create({ emailVerifiedAt: new Date(), fullName: 'Teacher Tester', email: 'teacher@i2.test', role: 'teacher' });
  const tokens = new Map([admin, student, other, teacher].map(user => [String(user._id), JWTUtil.createAccessToken(user)]));
  async function request(path, user, method = 'GET', body) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${tokens.get(String(user._id))}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, ...(await response.json()) };
  }
  const course = await Course.create({ title: 'Iteration 2 course', teacherId: teacher._id, status: 'PUBLIC' });
  const fakeId = new mongoose.Types.ObjectId();

  await t.test('teacher list/detail is admin-only, bounded, searchable and excludes secrets', async () => {
    assert.equal((await request('/api/admin/teachers')).status, 401);
    for (const user of [student, teacher]) assert.equal((await request('/api/admin/teachers', user)).status, 403);
    const list = await request('/api/admin/teachers?search=teacher&limit=1', admin);
    assert.equal(list.status, 200); assert.equal(list.data.pagination.total, 1);
    assert.equal(list.data.teachers[0]._id, String(teacher._id));
    for (const field of ['passwordHash', 'tokenVersion', 'passwordResetHash']) assert.equal(list.data.teachers[0][field], undefined);
    assert.equal((await request('/api/admin/teachers?search=.*', admin)).data.pagination.total, 0);
    for (const query of ['limit=-1', 'page=abc', 'teachingStatus=bad']) assert.equal((await request(`/api/admin/teachers?${query}`, admin)).status, 400);
    assert.equal((await request(`/api/admin/teachers/${teacher._id}`, admin)).status, 200);
    assert.equal((await request(`/api/admin/teachers/${student._id}`, admin)).status, 404);
    assert.equal((await request('/api/admin/teachers/bad', admin)).status, 400);
  });

  await t.test('notification operations isolate recipients and paginate; repeated reads succeed', async () => {
    const own = await Notification.create({ recipientId: student._id, title: 'Own', message: 'Own message' });
    const foreign = await Notification.create({ recipientId: other._id, title: 'Other', message: 'Other message' });
    await Notification.create({ recipientId: student._id, title: 'Second', message: 'Second message' });
    assert.equal((await request('/api/notifications')).status, 401);
    const list = await request('/api/notifications?limit=1&page=2', student);
    assert.equal(list.data.notifications.length, 1); assert.equal(list.data.pagination.total, 2); assert.equal(list.data.unreadCount, 2);
    assert.equal((await request('/api/notifications?limit=-1', student)).status, 400);
    assert.equal((await request(`/api/notifications/${foreign._id}/read`, student, 'PUT')).status, 404);
    assert.equal((await request(`/api/notifications/${foreign._id}`, student, 'DELETE')).status, 404);
    for (let i = 0; i < 2; i++) assert.equal((await request(`/api/notifications/${own._id}/read`, student, 'PUT')).status, 200);
    assert.equal((await request('/api/notifications/unread-count', student)).data.unreadCount, 1);
    assert.equal((await request('/api/notifications/read-all', student, 'PUT')).data.modifiedCount, 1);
    assert.equal((await request('/api/notifications/read-all', student, 'PUT')).data.modifiedCount, 0);
    assert.equal((await Notification.findById(foreign._id)).isRead, false);
    assert.equal((await request(`/api/notifications/${own._id}`, student, 'DELETE')).status, 200);
    assert.equal((await request(`/api/notifications/${own._id}`, student, 'DELETE')).status, 404);
    assert.equal((await request('/api/notifications/bad', student, 'DELETE')).status, 400);
    assert.equal((await request(`/api/notifications/${fakeId}/read`, student, 'PUT')).status, 404);
  });

  await t.test('reviews enforce unique authors, ownership, visibility and recalculate ratings', async () => {
    const path = `/api/student/courses/${course._id}/reviews`;
    for (const body of [{ rating: 0, content: 'No' }, { rating: 1.5, content: 'No' }, { rating: 5, content: ' ' }, { rating: 5, content: 'No', userId: other._id }]) assert.equal((await request(path, student, 'POST', body)).status, 400);
    const creates = await Promise.all([request(path, student, 'POST', { rating: 5, content: 'Great' }), request(path, student, 'POST', { rating: 4, content: 'Duplicate' })]);
    assert.deepEqual(creates.map(row => row.status).sort(), [201, 409]);
    const review = creates.find(row => row.status === 201).data.review;
    const second = await request(path, other, 'POST', { rating: 3, content: 'Good' });
    assert.equal(second.status, 201);
    const id = review._id;
    assert.equal((await request(`/api/student/reviews/${id}`, other, 'DELETE')).status, 403);
    assert.equal((await request(`/api/student/reviews/${id}`, other, 'PATCH', { rating: 1, content: 'Forged' })).status, 403);
    assert.equal((await request(`/api/admin/reviews/${id}/status`, student, 'PATCH', { status: 'hidden' })).status, 403);
    assert.equal((await request(`/api/admin/reviews/${id}/status`, admin, 'PATCH', { status: 'hidden' })).status, 200);
    const updated = await request(`/api/student/reviews/${id}`, student, 'PATCH', { rating: 1, content: 'Edited while hidden' });
    assert.equal(updated.data.review.status, 'hidden');
    assert.equal((await request(`/api/public/reviews/${id}`)).status, 404);
    assert.equal((await Course.findById(course._id)).averageRating, 3);
    assert.equal((await request(`/api/admin/reviews/${id}`, admin, 'DELETE')).status, 200);
    assert.equal((await Course.findById(course._id)).averageRating, 3);
    const deleted = await request(`/api/student/reviews/${second.data.review._id}`, other, 'DELETE');
    assert.equal(deleted.status, 200); assert.equal(deleted.data.averageRating, 0);
    assert.equal((await Course.findById(course._id)).averageRating, 0);
    assert.equal((await request(`/api/student/reviews/${id}`, student, 'DELETE')).status, 404);
    assert.equal((await request('/api/admin/reviews/bad', admin, 'DELETE')).status, 400);
  });

  await t.test('parallel writes converge to visible ratings and pending repair restores the average', async () => {
    const path = `/api/student/courses/${course._id}/reviews`;
    const results = await Promise.all([request(path, student, 'POST', { rating: 5, content: 'Five' }), request(path, other, 'POST', { rating: 3, content: 'Three' })]);
    assert.ok(results.every(res => res.status === 201));
    assert.equal((await Course.findById(course._id)).averageRating, 4);
    await Course.updateOne({ _id: course._id }, { $set: { averageRating: 0, ratingDirty: true } });
    await ReviewRepository.repairPendingRatings();
    assert.equal((await Course.findById(course._id)).averageRating, 4);
    assert.equal((await Course.findById(course._id).select('+ratingDirty')).ratingDirty, false);
  });

  await t.test('rating-write failures roll back on replica sets and leave a repair marker on standalone', async () => {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    const transactional = Boolean(hello.setName || hello.msg === 'isdbgrid');
    const review = await Review.findOne({ courseId: course._id, userId: student._id });
    const originalUpdate = Course.updateOne;
    Course.updateOne = function (filter, update, options) {
      if (Object.hasOwn(update.$set || {}, 'averageRating')) return Promise.reject(new Error('Injected rating write failure'));
      return originalUpdate.call(this, filter, update, options);
    };
    try {
      const response = await request(`/api/student/reviews/${review._id}`, student, 'PATCH', { rating: 1, content: 'Failure recovery test' });
      assert.equal(response.status, 500);
    } finally { Course.updateOne = originalUpdate; }
    assert.equal((await Review.findById(review._id)).rating, transactional ? 5 : 1);
    if (!transactional) {
      assert.equal((await Course.findById(course._id).select('+ratingDirty')).ratingDirty, true);
      await ReviewRepository.repairPendingRatings();
      assert.equal((await Course.findById(course._id)).averageRating, 2);
    } else assert.equal((await Course.findById(course._id)).averageRating, 4);
  });

  await t.test('suspension is idempotent and blocks existing sessions on main and alias teaching routes only', async () => {
    assert.equal((await request(`/api/admin/teachers/${teacher._id}/suspend`, student, 'PATCH')).status, 403);
    assert.equal((await request(`/api/admin/teachers/${student._id}/suspend`, admin, 'PATCH')).status, 404);
    assert.equal((await request(`/api/admin/teachers/${fakeId}/suspend`, admin, 'PATCH')).status, 404);
    for (let i = 0; i < 2; i++) assert.equal((await request(`/api/admin/teachers/${teacher._id}/suspend`, admin, 'PATCH')).status, 200);
    const current = await User.findById(teacher._id);
    assert.equal(current.status, 'active'); assert.equal(current.role, 'teacher'); assert.equal(current.tokenVersion, 0);
    for (const prefix of ['/api', '/api/v1']) {
      assert.equal((await request(`${prefix}/teacher/courses`, teacher)).status, 403);
      assert.equal((await request(`${prefix}/teacher/learning-content-reports`, teacher)).status, 403);
      assert.equal((await request(`${prefix}/courses/${course._id}/discussions`, teacher, 'POST', { content: 'Bypass' })).status, 403);
      assert.equal((await request(`${prefix}/notifications`, teacher)).status, 200);
      assert.equal((await request(`${prefix}/student/profile`, teacher)).status, 200);
    }
    assert.equal((await request('/api/admin/teachers?teachingStatus=suspended', admin)).data.pagination.total, 1);
  });
});
