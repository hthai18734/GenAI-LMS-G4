const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/model/identity/User');
const Course = require('../../src/model/learning/Course');
const Lesson = require('../../src/model/learning/Lesson');
const Quiz = require('../../src/model/learning/Quiz');
const Question = require('../../src/model/learning/Question');
const Enrollment = require('../../src/model/learning/Enrollment');
const QuizAttempt = require('../../src/model/learning/QuizAttempt');
const JWT = require('../../src/utils/auth/JWTUtil');
const { app } = require('../../src/index');

test('only teacher-published courses can be discovered, enrolled and started', { timeout: 120000 }, async (t) => {
  const mongo = await MongoMemoryServer.create();
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = 'publication-workflow-test';
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
    if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = previousSecret;
  });
  await mongoose.connect(mongo.getUri(), { dbName: 'course_publication_test' });
  const [teacher, student, secondStudent] = await User.create(['teacher', 'student', 'student'].map((role, index) => ({
    fullName: `Test ${role}`, email: `user${index}@publication.test`, role, emailVerifiedAt: new Date(),
  })));
  const course = await Course.create({ title: 'Publication regression', description: 'Course content', teacherId: teacher._id, isFeatured: true });
  const lesson = await Lesson.create({ courseId: course._id, title: 'Lesson', content: 'Content', order: 1, isPublished: true });
  const quiz = await Quiz.create({ courseId: course._id, lessonId: lesson._id, title: 'Quiz', timeLimit: 15, passingScore: 70, attemptLimit: 2 });
  const question = await Question.create({ quizId: quiz._id, ownerTeacherId: teacher._id, questionText: '1+1?', options: ['2', '3'], correctAnswer: '2' });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, user, method = 'GET', body) {
    const response = await fetch(base + path, { method,
      headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${JWT.createAccessToken(user)}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, ...(await response.json()) };
  }
  function expectStatus(response, status) {
    assert.equal(response.status, status, JSON.stringify(response));
    return response;
  }
  async function expectVisibility(count) {
    for (const path of ['/api/public/courses', '/api/public/courses/search?q=Publication', '/api/public/courses/filter']) {
      assert.equal(expectStatus(await request(path), 200).data.courses.length, count, path);
    }
    assert.equal((await request('/api/public/home')).data.featuredCourses.length, count);
    assert.equal((await request(`/api/public/teachers/${teacher._id}`)).data.publishedCourses.length, count);
    assert.equal((await request('/api/student/courses/catalog', student)).data.courses.length, count);
    expectStatus(await request(`/api/public/courses/${course._id}`), count ? 200 : 404);
  }
  await t.test('saving course details accepts the editor payload with no thumbnail', async () => {
    const updated = expectStatus(await request(`/api/teacher/courses/${course._id}`, teacher, 'PATCH', {
      title: course.title, description: course.description, categoryId: null, duration: 24, thumbnail: null,
    }), 200);
    assert.equal(updated.data.course.thumbnail, null);
    assert.equal(updated.data.course.status, 'DRAFT');
  });
  await t.test('every non-public lifecycle state is hidden and rejects enrollment', async () => {
    for (const status of ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']) {
      await Course.updateOne({ _id: course._id }, { status });
      await expectVisibility(0);
      expectStatus(await request(`/api/student/courses/${course._id}/enroll`, student, 'POST'), 400);
      expectStatus(await request(`/api/student/courses/${course._id}/quizzes`, student), 404);
      expectStatus(await request(`/api/student/courses/${course._id}/assignments`, student), 404);
      expectStatus(await request(`/api/student/courses/${course._id}/lessons`, student), 404);
      const start = expectStatus(await request(`/api/student/quizzes/${quiz._id}/attempts`, student, 'POST'), 409);
      assert.match(start.message, /not published/i);
      assert.equal(await Enrollment.countDocuments({ courseId: course._id }), 0);
      assert.equal(await QuizAttempt.countDocuments({ quizId: quiz._id }), 0);
    }
  });
  await t.test('teacher publish makes the same course and quiz available end to end', async () => {
    await Course.updateOne({ _id: course._id }, { status: 'APPROVED' });
    expectStatus(await request(`/api/teacher/courses/${course._id}/publish`, teacher, 'POST'), 200);
    await expectVisibility(1);
    expectStatus(await request(`/api/student/courses/${course._id}/enroll`, student, 'POST'), 201);
    assert.equal((await request('/api/student/courses', student)).data.courses.length, 1);
    const quizzes = expectStatus(await request(`/api/student/courses/${course._id}/quizzes`, student), 200).data.quizzes;
    assert.equal(quizzes[0]._id, String(quiz._id));
    const session = expectStatus(await request(`/api/student/quizzes/${quizzes[0]._id}/attempts`, student, 'POST'), 201).data;
    const result = expectStatus(await request(`/api/student/quiz-attempts/${session.attempt.id}/submit`, student, 'POST', {
      answers: [{ questionId: String(question._id), answer: '2' }],
    }), 200).data.result;
    assert.equal(result.passed, true);
    assert.equal(result.score, 100);
  });
  await t.test('unpublishing hides discovery and blocks new enrollments and stale quiz links', async () => {
    expectStatus(await request(`/api/teacher/courses/${course._id}/unpublish`, teacher, 'POST'), 200);
    await expectVisibility(0);
    expectStatus(await request(`/api/student/courses/${course._id}/enroll`, secondStudent, 'POST'), 400);
    expectStatus(await request(`/api/student/courses/${course._id}/lessons`, student), 404);
    expectStatus(await request(`/api/student/courses/${course._id}/resume`, student), 404);
    assert.equal((await request('/api/student/courses', student)).data.courses.length, 0);
    assert.equal((await request('/api/student/dashboard', student)).data.dashboard.courses.length, 0);
    expectStatus(await request(`/api/student/courses/${course._id}/quizzes`, student), 404);
    expectStatus(await request(`/api/student/quizzes/${quiz._id}/attempts`, student, 'POST'), 409);
    assert.equal(await QuizAttempt.countDocuments({ quizId: quiz._id }), 1);
    assert.equal(await Enrollment.countDocuments({ courseId: course._id }), 1);
  });
});
