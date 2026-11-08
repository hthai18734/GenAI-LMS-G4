const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/model/identity/User');
const Course = require('../../src/model/learning/Course');
const Category = require('../../src/model/learning/Category');
const Lesson = require('../../src/model/learning/Lesson');
const Question = require('../../src/model/learning/Question');
const QuizAttempt = require('../../src/model/learning/QuizAttempt');
const Enrollment = require('../../src/model/learning/Enrollment');
const JWT = require('../../src/utils/auth/JWTUtil');
const { app } = require('../../src/index');

test('lesson, question bank and quiz workflow through HTTP and isolated MongoDB', { timeout: 120000 }, async (t) => {
  const mongo = await MongoMemoryServer.create();
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = 'isolated-learning-workflow-test';
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
    if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = previousSecret;
  });
  await mongoose.connect(mongo.getUri(), { dbName: 'learning_workflow_test' });
  const [teacher, otherTeacher, student, otherStudent, admin] = await User.create(
    ['teacher', 'teacher', 'student', 'student', 'admin'].map((role, index) => ({
      fullName: `Test ${role}`, email: `user${index}@learning.test`, role, emailVerifiedAt: new Date(),
    })),
  );
  const category = await Category.create({ name: 'Artificial Intelligence', normalizedName: 'artificial intelligence' });
  const course = await Course.create({ title: 'Learning workflow', teacherId: teacher._id, categoryId: category._id });
  const baseCourse = `/api/teacher/courses/${course._id}`;
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
  let lesson;
  let bankQuestion;
  let quiz;
  let inlineQuestion;

  await t.test('lesson editor fields persist and published lessons are visible only to authorized users', async () => {
    const body = { title: 'Test lesson', content: 'Test content', order: 1, duration: 11, videoRef: 'https://youtu.be/example', isPublished: true };
    lesson = expectStatus(await request(`${baseCourse}/lessons`, teacher, 'POST', body), 201).data.lesson;
    const persisted = await Lesson.findById(lesson._id).lean();
    assert.equal(persisted.videoRef, body.videoRef);
    assert.equal(persisted.isPublished, true);
    expectStatus(await request(`${baseCourse}/lessons`, student, 'POST', body), 403);
    expectStatus(await request(`${baseCourse}/lessons`, otherTeacher, 'POST', body), 403);
    expectStatus(await request(`${baseCourse}/lessons`, teacher, 'POST', { ...body, isPublished: 'false' }), 400);
    await Enrollment.create({ userId: student._id, courseId: course._id });
    await Course.updateOne({ _id: course._id }, { status: 'PUBLIC' });
    const studentPath = `/api/student/courses/${course._id}/lessons`;
    expectStatus(await request(studentPath, otherStudent), 403);
    assert.equal(expectStatus(await request(studentPath, student), 200).data.lessons.length, 1);
    assert.equal(expectStatus(await request(studentPath, teacher), 200).data.lessons.length, 1);
    assert.equal(expectStatus(await request(studentPath, admin), 200).data.lessons.length, 1);
    await Course.updateOne({ _id: course._id }, { status: 'APPROVED' });
    expectStatus(await request(`${baseCourse}/lessons/${lesson._id}`, teacher, 'PATCH', { isPublished: false, videoRef: null }), 200);
    await Course.updateOne({ _id: course._id }, { status: 'PUBLIC' });
    assert.equal((await request(studentPath, student)).data.lessons.length, 0);
    await Course.updateOne({ _id: course._id }, { status: 'DRAFT' });
    expectStatus(await request(`${baseCourse}/lessons/${lesson._id}`, teacher, 'PATCH', { isPublished: true }), 200);
  });

  await t.test('standalone and quiz questions accept categoryId, populate category, and isolate ownership', async () => {
    const body = { questionText: '1+1?', options: ['2', '3'], correctAnswer: '2', explanation: 'Addition', categoryId: String(category._id) };
    bankQuestion = expectStatus(await request('/api/teacher/questions', teacher, 'POST', body), 201).data.question;
    assert.equal(bankQuestion.quizId, null);
    assert.equal(bankQuestion.ownerTeacherId, String(teacher._id));
    let list = expectStatus(await request(`/api/teacher/questions?categoryId=${category._id}&limit=100`, teacher), 200);
    assert.equal(list.data.total, 1);
    assert.equal(list.data.items[0].categoryId.name, category.name);
    assert.equal((await request('/api/teacher/questions', otherTeacher)).data.total, 0);
    expectStatus(await request(`/api/teacher/questions/${bankQuestion._id}`, otherTeacher), 403);
    expectStatus(await request(`/api/teacher/questions/${bankQuestion._id}`, student), 403);
    expectStatus(await request(`/api/teacher/questions/${bankQuestion._id}`, otherTeacher, 'PATCH', { correctAnswer: '3' }), 403);
    expectStatus(await request(`/api/teacher/questions/${bankQuestion._id}`, teacher, 'PATCH', { categoryId: null }), 200);
    assert.equal((await request(`/api/teacher/questions?categoryId=${category._id}`, teacher)).data.total, 0);
    expectStatus(await request(`/api/teacher/questions/${bankQuestion._id}`, teacher, 'PATCH', { categoryId: String(category._id) }), 200);
    expectStatus(await request('/api/teacher/questions', teacher, 'POST', { ...body, categoryId: 'bad' }), 400);
    quiz = expectStatus(await request(`${baseCourse}/quizzes`, teacher, 'POST', {
      title: 'Test quiz', lessonId: lesson._id, timeLimit: 15, passingScore: 70, attemptLimit: 2,
    }), 201).data.quiz;
    inlineQuestion = expectStatus(await request(`/api/teacher/quizzes/${quiz._id}/questions`, teacher, 'POST', {
      ...body, questionText: '2+2?', options: ['4', '5'], correctAnswer: '4',
    }), 201).data.question;
    expectStatus(await request(`/api/teacher/quizzes/${quiz._id}/questions/${bankQuestion._id}/link`, teacher, 'POST'), 200);
    const detail = expectStatus(await request(`/api/teacher/quizzes/${quiz._id}`, teacher), 200);
    assert.equal(detail.data.questions.length, 2);
    assert.equal((await request(`/api/teacher/questions?categoryId=${category._id}`, teacher)).data.total, 2);
    expectStatus(await request(`/api/teacher/questions/${bankQuestion._id}`, teacher, 'DELETE'), 409);
  });

  await t.test('student starts, submits, reopens score and grades against the persisted snapshot', async () => {
    await Course.updateOne({ _id: course._id }, { status: 'PUBLIC' });
    const quizPath = `/api/student/quizzes/${quiz._id}/attempts`;
    expectStatus(await request(quizPath, otherStudent, 'POST'), 403);
    expectStatus(await request(quizPath, teacher, 'POST'), 403);
    const session = expectStatus(await request(quizPath, student, 'POST'), 201).data;
    assert.equal(session.questions.length, 2);
    assert.ok(session.questions.every((question) => !Object.hasOwn(question, 'correctAnswer')));
    assert.equal(session.attempt.questionsSnapshot, undefined);
    const attempt = await QuizAttempt.findById(session.attempt.id).lean();
    assert.equal(attempt.questionsSnapshot.length, 2);
    // Editing the bank after starting must not change the student's grading contract.
    await Question.updateOne({ _id: bankQuestion._id }, { questionText: 'Changed later', correctAnswer: '3' });
    const answers = [
      { questionId: bankQuestion._id, answer: '2' },
      { questionId: inlineQuestion._id, answer: '4' },
    ];
    const submitPath = `/api/student/quiz-attempts/${session.attempt.id}/submit`;
    const submitted = expectStatus(await request(submitPath, student, 'POST', { answers }), 200).data.result;
    assert.equal(submitted.score, 100);
    assert.equal(submitted.passed, true);
    expectStatus(await request(submitPath, student, 'POST', { answers }), 409);
    const resultPath = `/api/student/quiz-attempts/${session.attempt.id}/result`;
    expectStatus(await request(resultPath, otherStudent), 409);
    const result = expectStatus(await request(resultPath, student), 200).data.result;
    assert.equal(result.score, 100);
    assert.equal(result.answers.find((answer) => answer.questionId === bankQuestion._id).questionText, '1+1?');
    const quizzes = expectStatus(await request(`/api/student/courses/${course._id}/quizzes`, student), 200).data.quizzes;
    assert.equal(quizzes[0].latestAttempt.score, 100);
    assert.equal(quizzes[0].latestAttempt.id, session.attempt.id);
  });

  await t.test('soft deleting a lesson actually hides it from teacher and student lists', async () => {
    await Course.updateOne({ _id: course._id }, { status: 'DRAFT' });
    expectStatus(await request(`${baseCourse}/lessons/${lesson._id}`, teacher, 'DELETE'), 200);
    assert.ok((await Lesson.findById(lesson._id)).deletedAt);
    assert.equal((await request(`${baseCourse}/lessons`, teacher)).data.lessons.length, 0);
    expectStatus(await request(`/api/student/courses/${course._id}/lessons`, student), 404);
  });

  await t.test('unlinking all questions leaves an empty quiz and preserves the question bank', async () => {
    for (const question of [inlineQuestion, bankQuestion]) {
      expectStatus(await request(`/api/teacher/quizzes/${quiz._id}/questions/${question._id}/unlink`, teacher, 'DELETE'), 200);
    }
    const detail = expectStatus(await request(`/api/teacher/quizzes/${quiz._id}`, teacher), 200);
    assert.equal(detail.data.questions.length, 0);
    assert.equal((await request('/api/teacher/questions', teacher)).data.total, 2);
    await Course.updateOne({ _id: course._id }, { status: 'PUBLIC' });
    // The linked lesson was deleted above, so the quiz is no longer student-visible.
    expectStatus(await request(`/api/student/quizzes/${quiz._id}/attempts`, student, 'POST'), 404);
    assert.equal(await QuizAttempt.countDocuments({ userId: student._id, quizId: quiz._id }), 1);
  });
});
