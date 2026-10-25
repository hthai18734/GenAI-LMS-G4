const test = require('node:test');
const assert = require('node:assert/strict');
const TeacherQuestionController = require('../../src/composition/http').controllers.TeacherQuestionController;
const { questionService: QuestionService } = require('../../src/composition/services');

const QUIZ_ID = '507f1f77bcf86cd799439011';
const QUESTION_ID = '507f1f77bcf86cd799439012';
const user = { _id: '507f1f77bcf86cd799439013', role: 'teacher' };
const question = { _id: QUESTION_ID, quizId: QUIZ_ID, questionText: 'Question?', options: ['A', 'B'], correctAnswer: 'A' };

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
  await method.call(TeacherQuestionController, req, res, (error) => { nextError = error; });
  if (nextError) throw nextError;
  return res;
}

test('question validation returns the SRS invalid-content message', async () => {
  const original = QuestionService.createQuestion;
  let called = false;
  QuestionService.createQuestion = async () => { called = true; };
  try {
    const res = await call(TeacherQuestionController.create, { params: { quizId: QUIZ_ID }, user, body: { questionText: '', options: ['A'], correctAnswer: 'B' } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid question content.');
    assert.equal(called, false);
  } finally {
    QuestionService.createQuestion = original;
  }
});

test('question controller returns SRS CRUD success messages', async () => {
  const originals = {
    createQuestion: QuestionService.createQuestion,
    updateQuestion: QuestionService.updateQuestion,
    deleteQuestion: QuestionService.deleteQuestion,
  };
  QuestionService.createQuestion = async () => question;
  QuestionService.updateQuestion = async () => ({ ...question, questionText: 'Updated question?' });
  QuestionService.deleteQuestion = async () => ({ ...question, deletedAt: new Date() });

  try {
    const body = { questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer };
    const created = await call(TeacherQuestionController.create, { params: { quizId: QUIZ_ID }, user, body });
    assert.equal(created.statusCode, 201);
    assert.equal(created.body.message, 'Question added successfully.');

    const updated = await call(TeacherQuestionController.update, { params: { questionId: QUESTION_ID }, user, body: { questionText: 'Updated question?' } });
    assert.equal(updated.body.message, 'Question updated successfully.');

    const deleted = await call(TeacherQuestionController.remove, { params: { questionId: QUESTION_ID }, user });
    assert.equal(deleted.body.message, 'Question deleted successfully.');
  } finally {
    Object.assign(QuestionService, originals);
  }
});
