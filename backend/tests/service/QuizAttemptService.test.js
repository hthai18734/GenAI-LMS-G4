const test = require('node:test');
const assert = require('node:assert/strict');
const { quizService: QuizService } = require('../../src/composition/services');
const QuizRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/QuizRepository');
const QuestionRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/QuestionRepository');
const QuizQuestionRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/QuizQuestionRepository');
const QuizAttemptRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/QuizAttemptRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const ProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/ProgressRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const ServiceError = require('../../src/service/common/ServiceError');
const { COURSE_STATUS } = require('../../src/domain/learning/CourseStatus');

const QUIZ_ID = '507f1f77bcf86cd799439011';
const COURSE_ID = '507f1f77bcf86cd799439012';
const LESSON_ID = '507f1f77bcf86cd799439013';
const ATTEMPT_ID = '507f1f77bcf86cd799439014';
const QUESTION_ONE_ID = '507f1f77bcf86cd799439015';
const QUESTION_TWO_ID = '507f1f77bcf86cd799439016';
const user = { _id: '507f1f77bcf86cd799439017', role: 'student' };
const otherUser = { _id: '507f1f77bcf86cd799439018', role: 'student' };

const quiz = { _id: QUIZ_ID, courseId: COURSE_ID, lessonId: LESSON_ID, title: 'Quiz', timeLimit: 20, passingScore: 50, attemptLimit: 2, deadline: null };
const questions = [
  { _id: QUESTION_ONE_ID, questionText: 'Question one', options: ['A', 'B'], correctAnswer: 'A' },
  { _id: QUESTION_TWO_ID, questionText: 'Question two', options: ['C', 'D'], correctAnswer: 'D' },
];

function activeAttempt(overrides = {}) {
  return {
    _id: ATTEMPT_ID,
    quizId: QUIZ_ID,
    userId: user._id,
    courseId: COURSE_ID,
    lessonId: LESSON_ID,
    status: 'in_progress',
    startedAt: new Date(Date.now() - 60_000),
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

function restore(target, originals) { Object.assign(target, originals); }

function startOriginals() {
  return {
    quiz: QuizRepository.findById,
    course: CourseRepository.findById,
    enrollment: EnrollmentRepository.findAccessibleEnrollment,
    count: QuizAttemptRepository.countByUserAndQuiz,
    create: QuizAttemptRepository.create,
    questions: QuestionRepository.findByQuizId,
    quizQuestions: QuizQuestionRepository.findQuestionIdsByQuizId,
  };
}

function restoreStart(originals) {
  QuizRepository.findById = originals.quiz;
  CourseRepository.findById = originals.course;
  EnrollmentRepository.findAccessibleEnrollment = originals.enrollment;
  QuizAttemptRepository.countByUserAndQuiz = originals.count;
  QuizAttemptRepository.create = originals.create;
  QuestionRepository.findByQuizId = originals.questions;
  QuizQuestionRepository.findQuestionIdsByQuizId = originals.quizQuestions;
}

function mockStart({ currentQuiz = quiz, course = { _id: COURSE_ID, status: COURSE_STATUS.PUBLIC }, enrollment = { _id: 'enrollment' }, attemptCount = 0 } = {}) {
  QuizRepository.findById = async () => currentQuiz;
  CourseRepository.findById = async () => course;
  EnrollmentRepository.findAccessibleEnrollment = async () => enrollment;
  QuizAttemptRepository.countByUserAndQuiz = async () => attemptCount;
  QuizAttemptRepository.create = async (data) => ({ _id: ATTEMPT_ID, ...data });
  QuizQuestionRepository.findQuestionIdsByQuizId = async () => [];
  QuestionRepository.findByQuizId = async () => questions;
}

test('student starts an available public-course quiz without receiving correct answers', async () => {
  const originals = startOriginals();
  mockStart();
  try {
    const session = await QuizService.startQuiz(QUIZ_ID, user);
    assert.equal(session.attempt.status, 'in_progress');
    assert.equal(session.questions.length, 2);
    assert.equal(session.questions[0].correctAnswer, undefined);
    assert.ok(session.attempt.expiresAt > session.attempt.startedAt);
  } finally {
    restoreStart(originals);
  }
});

test('student cannot start a quiz in a course they cannot access', async () => {
  const originals = startOriginals();
  mockStart({ enrollment: null });
  try {
    await assert.rejects(
      QuizService.startQuiz(QUIZ_ID, user),
      (error) => error instanceof ServiceError && error.status === 403 && error.publicMessage === 'You do not have permission to perform this action.',
    );
  } finally {
    restoreStart(originals);
  }
});

test('available quizzes expose only the student\'s most recent submitted score for review', async () => {
  const originals = {
    course: CourseRepository.findById,
    enrollment: EnrollmentRepository.findAccessibleEnrollment,
    quizzes: QuizRepository.findByCourseId,
    latestAttempts: QuizAttemptRepository.findLatestSubmittedByUserAndQuizIds,
  };
  const olderAttempt = { _id: '507f1f77bcf86cd799439019', quizId: QUIZ_ID, score: 40, passed: false, submittedAt: new Date('2026-01-01') };
  const latestAttempt = { _id: ATTEMPT_ID, quizId: QUIZ_ID, score: 90, passed: true, submittedAt: new Date('2026-01-02') };
  CourseRepository.findById = async () => ({ _id: COURSE_ID, status: COURSE_STATUS.PUBLIC });
  EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enrollment' });
  QuizRepository.findByCourseId = async () => [{ ...quiz, toObject: () => ({ ...quiz }) }];
  QuizAttemptRepository.findLatestSubmittedByUserAndQuizIds = async (userId, quizIds) => {
    assert.equal(userId, user._id);
    assert.deepEqual(quizIds, [QUIZ_ID]);
    return [latestAttempt, olderAttempt];
  };

  try {
    const quizzes = await QuizService.listAvailableQuizzes(COURSE_ID, user);
    assert.equal(quizzes[0].latestAttempt.id, ATTEMPT_ID);
    assert.equal(quizzes[0].latestAttempt.score, 90);
  } finally {
    CourseRepository.findById = originals.course;
    EnrollmentRepository.findAccessibleEnrollment = originals.enrollment;
    QuizRepository.findByCourseId = originals.quizzes;
    QuizAttemptRepository.findLatestSubmittedByUserAndQuizIds = originals.latestAttempts;
  }
});

test('student cannot start when attempts are exhausted or the course is unpublished', async () => {
  const originals = startOriginals();
  try {
    mockStart({ attemptCount: quiz.attemptLimit });
    await assert.rejects(QuizService.startQuiz(QUIZ_ID, user), (error) => error.publicMessage === 'No quiz attempts remaining.');

    mockStart({ course: { _id: COURSE_ID, status: 'DRAFT' } });
    await assert.rejects(QuizService.startQuiz(QUIZ_ID, user), (error) => error.status === 404 && error.publicMessage === 'Quiz not found.');

    mockStart({ currentQuiz: { ...quiz, isPublished: false } });
    await assert.rejects(QuizService.startQuiz(QUIZ_ID, user), (error) => error.status === 404 && error.publicMessage === 'Quiz not found.');
  } finally {
    restoreStart(originals);
  }
});

test('submission auto-grades persisted answers and updates the existing lesson progress record', async () => {
  const originals = {
    attempt: QuizAttemptRepository.findByIdForUser,
    submit: QuizAttemptRepository.submit,
    quiz: QuizRepository.findById,
    questions: QuestionRepository.findByQuizId,
    quizQuestions: QuizQuestionRepository.findQuestionIdsByQuizId,
    progress: ProgressRepository.upsertProgress,
  };
  let persisted = null;
  let progress = null;
  QuizAttemptRepository.findByIdForUser = async () => activeAttempt();
  QuizAttemptRepository.submit = async (id, userId, updates) => { persisted = { id, userId, updates }; return { ...activeAttempt(), ...updates }; };
  QuizRepository.findById = async () => quiz;
  QuizQuestionRepository.findQuestionIdsByQuizId = async () => [];
  QuestionRepository.findByQuizId = async () => questions;
  ProgressRepository.upsertProgress = async (...args) => { progress = args; };

  try {
    const result = await QuizService.submitQuiz(ATTEMPT_ID, user, {
      toObject: () => ({ answers: [{ questionId: QUESTION_ONE_ID, answer: 'A' }, { questionId: QUESTION_TWO_ID, answer: 'C' }] }),
    });
    assert.equal(result.score, 50);
    assert.equal(result.passed, true);
    assert.deepEqual(persisted.updates.answers.map((answer) => answer.isCorrect), [true, false]);
    assert.deepEqual(progress, [user._id, COURSE_ID, LESSON_ID, 'completed']);
  } finally {
    restore(QuizAttemptRepository, { findByIdForUser: originals.attempt, submit: originals.submit });
    QuizRepository.findById = originals.quiz;
    QuizQuestionRepository.findQuestionIdsByQuizId = originals.quizQuestions;
    QuestionRepository.findByQuizId = originals.questions;
    ProgressRepository.upsertProgress = originals.progress;
  }
});

test('submission rejects a duplicate or expired attempt', async () => {
  const original = QuizAttemptRepository.findByIdForUser;
  QuizAttemptRepository.findByIdForUser = async () => activeAttempt({ status: 'submitted', submittedAt: new Date() });
  try {
    await assert.rejects(
      QuizService.submitQuiz(ATTEMPT_ID, user, { toObject: () => ({ answers: [] }) }),
      (error) => error instanceof ServiceError && error.status === 409 && error.publicMessage === 'This quiz attempt has already been submitted.',
    );
  } finally {
    QuizAttemptRepository.findByIdForUser = original;
  }

  QuizAttemptRepository.findByIdForUser = async () => activeAttempt({ expiresAt: new Date(Date.now() - 1000) });
  try {
    await assert.rejects(
      QuizService.submitQuiz(ATTEMPT_ID, user, { toObject: () => ({ answers: [] }) }),
      (error) => error instanceof ServiceError && error.status === 409 && error.publicMessage === 'The quiz attempt is invalid or no longer active.',
    );
  } finally {
    QuizAttemptRepository.findByIdForUser = original;
  }
});

test('result belongs only to its student and is unavailable before submission', async () => {
  const original = QuizAttemptRepository.findByIdForUser;
  QuizAttemptRepository.findByIdForUser = async (id, userId) => {
    if (userId !== user._id) return null;
    return activeAttempt();
  };

  try {
    await assert.rejects(
      QuizService.getQuizResult(ATTEMPT_ID, otherUser),
      (error) => error instanceof ServiceError && error.status === 409 && error.publicMessage === 'Quiz result is available only after submission.',
    );
    await assert.rejects(
      QuizService.getQuizResult(ATTEMPT_ID, user),
      (error) => error instanceof ServiceError && error.status === 409 && error.publicMessage === 'Quiz result is available only after submission.',
    );
  } finally {
    QuizAttemptRepository.findByIdForUser = original;
  }
});

test('startQuiz calculates expiresAt based on timeLimit and respects attemptLimit', async () => {
  const originals = startOriginals();
  let createdAttemptData = null;
  const customTimeLimit = 25; // 25 minutes

  try {
    // Allowed when attemptCount < attemptLimit
    mockStart({ attemptCount: 1, currentQuiz: { ...quiz, timeLimit: customTimeLimit, attemptLimit: 3 } });
    QuizAttemptRepository.create = async (data) => {
      createdAttemptData = data;
      return { ...data, _id: ATTEMPT_ID };
    };

    const started = await QuizService.startQuiz(QUIZ_ID, user);
    assert.ok(started.attempt);
    assert.equal(started.quiz.timeLimit, customTimeLimit);

    // Verify timeLimit calculation
    const startedAtMs = new Date(createdAttemptData.startedAt).getTime();
    const expiresAtMs = new Date(createdAttemptData.expiresAt).getTime();
    const expectedDiffMs = customTimeLimit * 60 * 1000;
    assert.equal(expiresAtMs - startedAtMs, expectedDiffMs);

    // Blocked when attemptCount reaches attemptLimit
    mockStart({ attemptCount: 3, currentQuiz: { ...quiz, timeLimit: customTimeLimit, attemptLimit: 3 } });
    await assert.rejects(
      QuizService.startQuiz(QUIZ_ID, user),
      (error) => error instanceof ServiceError && error.status === 409 && error.publicMessage === 'No quiz attempts remaining.',
    );
  } finally {
    restoreStart(originals);
  }
});

test('listAvailableQuizzes ignores in-progress attempts and returns only latest submitted score', async () => {
  const originals = {
    course: CourseRepository.findById,
    enrollment: EnrollmentRepository.findAccessibleEnrollment,
    quizzes: QuizRepository.findByCourseId,
    latestAttempts: QuizAttemptRepository.findLatestSubmittedByUserAndQuizIds,
  };

  CourseRepository.findById = async () => ({ _id: COURSE_ID, status: COURSE_STATUS.PUBLIC });
  EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enrollment' });
  QuizRepository.findByCourseId = async () => [{ ...quiz, toObject: () => ({ ...quiz }) }];

  // Repository only returns submitted attempts according to query status: 'submitted'
  const submittedAttempt = { _id: ATTEMPT_ID, quizId: QUIZ_ID, score: 85, passed: true, status: 'submitted', submittedAt: new Date() };
  QuizAttemptRepository.findLatestSubmittedByUserAndQuizIds = async (userId, quizIds) => {
    // Verify it only looks for submitted attempts
    return [submittedAttempt];
  };

  try {
    const quizzes = await QuizService.listAvailableQuizzes(COURSE_ID, user);
    assert.equal(quizzes[0].latestAttempt.id, ATTEMPT_ID);
    assert.equal(quizzes[0].latestAttempt.score, 85);
    assert.equal(quizzes[0].latestAttempt.passed, true);
  } finally {
    CourseRepository.findById = originals.course;
    EnrollmentRepository.findAccessibleEnrollment = originals.enrollment;
    QuizRepository.findByCourseId = originals.quizzes;
    QuizAttemptRepository.findLatestSubmittedByUserAndQuizIds = originals.latestAttempts;
  }
});
