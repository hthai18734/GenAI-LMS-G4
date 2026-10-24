const test = require('node:test');
const assert = require('node:assert/strict');
const SubmitQuizDTO = require('../../src/dto/student/SubmitQuizDTO');

const QUESTION_ID = '507f1f77bcf86cd799439011';

test('submit quiz DTO accepts answer-only payloads and rejects client grading fields', () => {
  const valid = new SubmitQuizDTO({ answers: [{ questionId: QUESTION_ID, answer: 'Option A' }] });
  assert.deepEqual(valid.validate(), {});
  assert.deepEqual(valid.toObject(), { answers: [{ questionId: QUESTION_ID, answer: 'Option A' }] });

  const forged = new SubmitQuizDTO({ answers: [{ questionId: QUESTION_ID, answer: 'Option A', correctAnswer: 'Option A' }] });
  // Nested unrecognized fields are discarded, so grading remains server-controlled.
  assert.deepEqual(forged.validate(), {});
  assert.deepEqual(forged.toObject(), { answers: [{ questionId: QUESTION_ID, answer: 'Option A' }] });
});

test('submit quiz DTO rejects missing, malformed, or duplicate answers', () => {
  assert.ok(new SubmitQuizDTO({}).validate().answers);
  assert.ok(new SubmitQuizDTO({ answers: [{ questionId: 'invalid', answer: '' }] }).validate()['answers[0].questionId']);
  assert.ok(new SubmitQuizDTO({ answers: [{ questionId: QUESTION_ID, answer: 'A' }, { questionId: QUESTION_ID, answer: 'B' }] }).validate()['answers[1].questionId']);
});
