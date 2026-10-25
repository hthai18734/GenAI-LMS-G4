const test = require('node:test');
const assert = require('node:assert/strict');
const StudentQuizController = require('../../src/composition/http').controllers.StudentQuizController;
const { quizService: QuizService } = require('../../src/composition/services');

const QUIZ_ID = '507f1f77bcf86cd799439011';
const ATTEMPT_ID = '507f1f77bcf86cd799439012';
const QUESTION_ID = '507f1f77bcf86cd799439013';
const user = { _id: '507f1f77bcf86cd799439014', role: 'student' };

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
  await method.call(StudentQuizController, req, res, (error) => { nextError = error; });
  if (nextError) throw nextError;
  return res;
}

test('student quiz controller returns SRS start, submit, and result structures', async () => {
  const originals = { startQuiz: QuizService.startQuiz, submitQuiz: QuizService.submitQuiz, getQuizResult: QuizService.getQuizResult };
  QuizService.startQuiz = async () => ({ attempt: { id: ATTEMPT_ID }, questions: [] });
  QuizService.submitQuiz = async () => ({ attemptId: ATTEMPT_ID, score: 100 });
  QuizService.getQuizResult = async () => ({ attemptId: ATTEMPT_ID, score: 100 });
  try {
    const started = await call(StudentQuizController.start, { params: { quizId: QUIZ_ID }, user, body: {} });
    assert.equal(started.statusCode, 201);
    assert.equal(started.body.message, 'Quiz attempt started successfully.');

    const submitted = await call(StudentQuizController.submit, { params: { attemptId: ATTEMPT_ID }, user, body: { answers: [{ questionId: QUESTION_ID, answer: 'A' }] } });
    assert.equal(submitted.body.message, 'Quiz submitted successfully.');

    const result = await call(StudentQuizController.getResult, { params: { attemptId: ATTEMPT_ID }, user });
    assert.equal(result.body.data.result.score, 100);
  } finally {
    Object.assign(QuizService, originals);
  }
});
