const test = require('node:test');
const assert = require('node:assert/strict');
const QuizService = require('../../src/service/learning/QuizService');
const id = '507f1f77bcf86cd799439011';
test('quiz cannot start at deadline equality', async () => {
  let creates = 0;
  const deadline = new Date('2030-01-01T00:00:00Z');
  const service = new QuizService({
    clock: () => deadline,
    quizRepository: { findById: async () => ({ _id: id, courseId: id, isPublished: true, deadline, attemptLimit: 3 }) },
    courseRepository: { findById: async () => ({ status: 'PUBLIC' }) },
    enrollmentRepository: { findAccessibleEnrollment: async () => ({}) },
    quizAttemptRepository: { countByUserAndQuiz: async () => 0, create: async () => { creates++; return {}; } },
    quizQuestionRepository: { findQuestionIdsByQuizId: async () => [] },
    questionRepository: { findByQuizId: async () => [{ _id: id, options: ['A'], correctAnswer: 'A' }] },
  });
  await assert.rejects(service.startQuiz(id, { _id: id }), e => e.status === 409 && /deadline/.test(e.message));
  assert.equal(creates, 0);
});
test('late quiz submission cannot replace an earlier submitted result', async () => {
  let writes = 0; const deadline = new Date('2030-01-01T00:00:00Z');
  const service = new QuizService({ clock: () => deadline,
    quizAttemptRepository: { findByIdForUser: async () => ({ _id: id, quizId: id, status: 'in_progress', expiresAt: new Date(deadline.getTime() + 60000) }), submit: async () => { writes++; return {}; } },
    quizRepository: { findById: async () => ({ _id: id, deadline }) },
  });
  await assert.rejects(service.submitQuiz(id, { _id: id }, { answers: [] }), e => e.status === 409 && /deadline/.test(e.message));
  assert.equal(writes, 0);
});
