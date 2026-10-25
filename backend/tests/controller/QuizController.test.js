const test = require('node:test');
const assert = require('node:assert/strict');
const TeacherQuizController = require('../../src/composition/http').controllers.TeacherQuizController;
const { quizService: QuizService } = require('../../src/composition/services');

const COURSE_ID = '507f1f77bcf86cd799439011';
const QUIZ_ID = '507f1f77bcf86cd799439012';
const user = { _id: '507f1f77bcf86cd799439013', role: 'teacher' };

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function call(method, req) {
  const res = response();
  let nextError;
  await method.call(TeacherQuizController, req, res, (error) => { nextError = error; });
  if (nextError) throw nextError;
  return res;
}

test('create returns DTO validation failures without calling the service', async () => {
  const original = QuizService.createQuiz;
  let called = false;
  QuizService.createQuiz = async () => { called = true; };

  try {
    const res = await call(TeacherQuizController.create, { params: { courseId: COURSE_ID }, user, body: { title: '', timeLimit: 0, passingScore: 120 } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.title);
    assert.equal(called, false);
  } finally {
    QuizService.createQuiz = original;
  }
});

test('teacher quiz controller returns standard CRUD response structures', async () => {
  const originals = {
    createQuiz: QuizService.createQuiz,
    listQuizzes: QuizService.listQuizzes,
    getQuizDetails: QuizService.getQuizDetails,
    updateQuiz: QuizService.updateQuiz,
    deleteQuiz: QuizService.deleteQuiz,
  };
  const quiz = { _id: QUIZ_ID, courseId: COURSE_ID, title: 'Quiz', timeLimit: 15, passingScore: 70, attemptLimit: 2 };
  QuizService.createQuiz = async () => quiz;
  QuizService.listQuizzes = async () => [quiz];
  QuizService.getQuizDetails = async () => ({ quiz, questions: [{ _id: 'question-1' }] });
  QuizService.updateQuiz = async () => ({ ...quiz, timeLimit: 20 });
  QuizService.deleteQuiz = async () => ({ ...quiz, deletedAt: new Date() });

  try {
    const body = { title: 'Quiz', timeLimit: 15, passingScore: 70, attemptLimit: 2 };
    const created = await call(TeacherQuizController.create, { params: { courseId: COURSE_ID }, user, body });
    assert.equal(created.statusCode, 201);
    assert.equal(created.body.data.quiz._id, QUIZ_ID);

    const listed = await call(TeacherQuizController.list, { params: { courseId: COURSE_ID }, user });
    assert.equal(listed.body.data.quizzes[0]._id, QUIZ_ID);

    const viewed = await call(TeacherQuizController.getById, { params: { quizId: QUIZ_ID }, user });
    assert.equal(viewed.statusCode, 200);
    assert.equal(viewed.body.data.quiz.title, 'Quiz');
    assert.equal(viewed.body.data.questions.length, 1);

    const updated = await call(TeacherQuizController.update, { params: { quizId: QUIZ_ID }, user, body: { timeLimit: 20 } });
    assert.equal(updated.body.data.quiz.timeLimit, 20);

    const deleted = await call(TeacherQuizController.remove, { params: { quizId: QUIZ_ID }, user });
    assert.equal(deleted.statusCode, 200);
    assert.equal(deleted.body.message, 'Quiz deleted successfully.');
  } finally {
    Object.assign(QuizService, originals);
  }
});
