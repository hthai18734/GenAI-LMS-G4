const test = require('node:test');
const assert = require('node:assert/strict');
const CreateQuizDTO = require('../../src/dto/quiz/CreateQuizDTO');
const UpdateQuizDTO = require('../../src/dto/quiz/UpdateQuizDTO');

const LESSON_ID = '507f1f77bcf86cd799439011';

test('create quiz DTO validates quiz fields and rejects protected fields', () => {
  const dto = new CreateQuizDTO({
    title: '  Module check-in ', lessonId: LESSON_ID, timeLimit: '15', passingScore: '70', attemptLimit: '2',
    courseId: '507f1f77bcf86cd799439012', teacherId: 'other-teacher',
  });

  assert.ok(dto.validate().payload);
  assert.deepEqual(dto.toObject(), {
    title: 'Module check-in', lessonId: LESSON_ID, timeLimit: 15, passingScore: 70, attemptLimit: 2,
  });
});

test('create quiz DTO requires a valid title, lesson, time limit, and passing score', () => {
  const dto = new CreateQuizDTO({ title: ' ', lessonId: 0, timeLimit: 0, passingScore: 101, attemptLimit: 0 });
  const errors = dto.validate();

  assert.ok(errors.title);
  assert.ok(errors.lessonId);
  assert.ok(errors.timeLimit);
  assert.ok(errors.passingScore);
  assert.ok(errors.attemptLimit);
});

test('create quiz DTO requires attemptLimit to be provided and >= 1', () => {
  const missing = new CreateQuizDTO({ title: 'Quiz 1', timeLimit: 10, passingScore: 80 });
  assert.equal(missing.validate().attemptLimit, 'Attempt limit is required.');

  const invalidZero = new CreateQuizDTO({ title: 'Quiz 1', timeLimit: 10, passingScore: 80, attemptLimit: 0 });
  assert.equal(invalidZero.validate().attemptLimit, 'Attempt limit must be an integer greater than zero.');

  const valid = new CreateQuizDTO({ title: 'Quiz 1', timeLimit: 10, passingScore: 80, attemptLimit: 1 });
  assert.equal(valid.validate().attemptLimit, undefined);
});

test('update quiz DTO allows omitting attemptLimit or updating it', () => {
  const withoutAttemptLimit = new UpdateQuizDTO({ title: 'New Title' });
  assert.deepEqual(withoutAttemptLimit.validate(), {});

  const invalidAttemptLimit = new UpdateQuizDTO({ attemptLimit: -1 });
  assert.equal(invalidAttemptLimit.validate().attemptLimit, 'Attempt limit must be an integer greater than zero.');

  const validAttemptLimit = new UpdateQuizDTO({ attemptLimit: 5 });
  assert.deepEqual(validAttemptLimit.validate(), {});
  assert.equal(validAttemptLimit.toObject().attemptLimit, 5);
});
