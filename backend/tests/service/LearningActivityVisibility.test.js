const test = require('node:test');
const assert = require('node:assert/strict');
const QuizService = require('../../src/service/learning/QuizService');
const AssignmentService = require('../../src/service/learning/AssignmentService');

const courseId = '507f1f77bcf86cd799439011';
const visibleLessonId = '507f1f77bcf86cd799439012';
const draftLessonId = '507f1f77bcf86cd799439013';
const user = { _id: '507f1f77bcf86cd799439014', role: 'student' };
const course = { _id: courseId, status: 'PUBLIC', deletedAt: null };
const lessonRepository = {
  findById: async (id) => ({ _id: id, courseId, isPublished: String(id) === visibleLessonId }),
};

test('student quiz list excludes quizzes linked to draft lessons', async () => {
  const service = new QuizService({
    courseRepository: { findById: async () => course },
    enrollmentRepository: { findAccessibleEnrollment: async () => ({ _id: 'enrollment' }) },
    lessonRepository,
    quizRepository: { findByCourseId: async () => [
      { _id: 'quiz-course', lessonId: null },
      { _id: 'quiz-visible', lessonId: visibleLessonId },
      { _id: 'quiz-draft', lessonId: draftLessonId },
    ] },
    quizAttemptRepository: { findLatestSubmittedByUserAndQuizIds: async () => [] },
  });
  const quizzes = await service.listAvailableQuizzes(courseId, user);
  assert.deepEqual(quizzes.map((quiz) => quiz._id), ['quiz-course', 'quiz-visible']);
});

test('student assignment list excludes assignments linked to draft lessons', async () => {
  const service = new AssignmentService({
    courseRepository: { findById: async () => course },
    enrollmentRepository: { findAccessibleEnrollment: async () => ({ _id: 'enrollment' }) },
    lessonRepository,
    assignmentRepository: { findByCourseId: async () => [
      { _id: 'assignment-course', lessonId: null },
      { _id: 'assignment-visible', lessonId: visibleLessonId },
      { _id: 'assignment-draft', lessonId: draftLessonId },
    ] },
    assignmentSubmissionRepository: { findByStudentAndCourse: async () => [] },
  });
  const assignments = await service.listAvailableAssignments(courseId, user);
  assert.deepEqual(assignments.map((assignment) => assignment._id), ['assignment-course', 'assignment-visible']);
});
