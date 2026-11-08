const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Question = require('../../src/model/learning/Question');
const Lesson = require('../../src/model/learning/Lesson');
const QuizAttempt = require('../../src/model/learning/QuizAttempt');
const id = () => new mongoose.Types.ObjectId();

test('bank questions validate without a quiz and retain ownership and category', () => {
  const ownerTeacherId = id();
  const categoryId = id();
  const question = new Question({ ownerTeacherId, categoryId, quizId: null, questionText: '1+1?', options: ['2', '3'], correctAnswer: '2' });
  assert.equal(question.validateSync(), undefined);
  assert.equal(String(question.ownerTeacherId), String(ownerTeacherId));
  assert.equal(String(question.categoryId), String(categoryId));
  assert.equal(Question.schema.path('categoryId').options.ref, 'Category');
});

test('lesson persistence retains video, publication and soft deletion', () => {
  const lesson = new Lesson({ courseId: id(), title: 'Lesson', content: 'Notes', order: 1, videoRef: '/uploads/lesson-videos/test.mp4', isPublished: true, deletedAt: new Date() });
  assert.equal(lesson.validateSync(), undefined);
  assert.equal(lesson.videoRef, '/uploads/lesson-videos/test.mp4');
  assert.equal(lesson.isPublished, true);
  assert.ok(lesson.deletedAt instanceof Date);
});

test('quiz attempt persistence retains the grading snapshot and readable submitted answers', () => {
  const questionId = id();
  const attempt = new QuizAttempt({ quizId: id(), userId: id(), courseId: id(), expiresAt: new Date(),
    questionsSnapshot: [{ questionId, questionText: '1+1?', options: ['2', '3'], correctAnswer: '2' }],
    answers: [{ questionId, questionText: '1+1?', answer: '2', isCorrect: true }],
  });
  assert.equal(attempt.validateSync(), undefined);
  assert.equal(attempt.questionsSnapshot[0].correctAnswer, '2');
  assert.equal(attempt.answers[0].questionText, '1+1?');
});
