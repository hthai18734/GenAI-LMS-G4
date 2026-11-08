const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCompletion } = require('../../src/domain/learning/CourseCompletionPolicy');
const StudentLearningService = require('../../src/service/student/StudentLearningService');
const EnrollmentLifecycleService = require('../../src/service/learning/EnrollmentLifecycleService');

const userId = '507f1f77bcf86cd799439011', courseId = '507f1f77bcf86cd799439012';
const lessonId = '507f1f77bcf86cd799439013', enrollmentId = '507f1f77bcf86cd799439014';
function sources() {
  return {
    lessons: [{ _id: lessonId, title: 'Lesson', isPublished: true, videoRef: '/video.mp4' }],
    progressRecords: [{ lessonId, status: 'completed' }],
    videos: [{ lessonId, watchedPercent: 90 }],
    quizzes: [{ _id: 'q', title: 'Quiz', isPublished: true, passingScore: 50 }],
    assignments: [{ _id: 'a', title: 'Assignment', maxScore: 10, passingScore: 5 }],
    attempts: [{ _id: 'old', quizId: 'q', status: 'submitted', score: 90, passed: true, submittedAt: new Date(1000) },
      { _id: 'new', quizId: 'q', status: 'submitted', score: 50, passed: true, submittedAt: new Date(2000) }],
    submissions: [{ _id: 's', assignmentId: 'a', score: 8, maxScore: 10, status: 'passed', submittedAt: new Date(1000) }],
  };
}
test('completion uses latest submitted scores and requires every learning activity', () => {
  const result = evaluateCompletion(sources());
  assert.equal(result.eligibleToComplete, true);
  assert.equal(result.cells.find(c => c.key === 'quiz:q').score, 50);
  assert.equal(result.percentage, 100);
  assert.deepEqual(result.remainingActivities, []);
  const data = sources(); data.attempts[1].score = 40; data.attempts[1].passed = false;
  assert.equal(evaluateCompletion(data).eligibleToComplete, false);
  assert.deepEqual(evaluateCompletion(data).remainingActivities, ['Quiz: Quiz']);
});
test('video below threshold, missing submission, zero grade and missing threshold cannot pass', () => {
  for (const mutate of [
    d => { d.videos[0].watchedPercent = 89; },
    d => { d.submissions = []; },
    d => { d.submissions[0].score = 0; d.submissions[0].status = 'needs_revision'; },
    d => { d.assignments[0].passingScore = null; d.submissions[0].status = 'graded'; },
  ]) { const data = sources(); mutate(data); assert.equal(evaluateCompletion(data).eligibleToComplete, false); }
  const data = sources(); data.submissions[0].score = 0;
  assert.equal(evaluateCompletion(data).cells[0].score, 0);
});
test('draft/deleted content is excluded and accepted work survives later deadline edits', () => {
  const data = sources();
  data.lessons.push({ _id: 'draft', isPublished: false });
  data.quizzes.push({ _id: 'draft-q', isPublished: false }, { _id: 'deleted', isPublished: true, deletedAt: new Date() });
  data.assignments[0].deadline = new Date(0);
  assert.equal(evaluateCompletion(data).eligibleToComplete, true);
  assert.equal(evaluateCompletion(data).totalRequired, 3);
  assert.equal(evaluateCompletion({}).eligibleToComplete, false);
});
test('in-progress quiz does not replace a submitted attempt; ties use immutable IDs', () => {
  const data = sources(); data.attempts.push({ _id: 'z', quizId: 'q', status: 'in_progress', score: 0, submittedAt: new Date(3000) });
  assert.equal(evaluateCompletion(data).cells[1].score, 50);
  data.attempts.push({ _id: 'zzz', quizId: 'q', status: 'submitted', score: 30, passed: false, submittedAt: new Date(2000) });
  assert.equal(evaluateCompletion(data).cells[1].score, 30);
});
test('lesson-triggered completion cannot issue a certificate while an assessment is missing', async () => {
  let issued = 0, finalized = 0;
  const service = new StudentLearningService({
    enrollmentRepository: { findAccessibleEnrollment: async () => ({ _id: enrollmentId }), markCompleted: async () => {} },
    lessonRepository: { findById: async () => ({ _id: lessonId, courseId, isPublished: true }), countByCourseId: async () => 1 },
    progressRepository: { upsertProgress: async () => {}, countByUserAndCourse: async () => 1 },
    learningActivityLogRepository: { recordActivityOnce: async () => {} },
    certificateRepository: { issueCertificate: async () => { issued++; return {}; } },
    progressTrackingService: { recalculateCourseProgress: async () => ({ eligibleToComplete: false, byType: { LESSON: { completed: 1, total: 1 } } }) },
    enrollmentLifecycleService: { completeCourse: async () => { finalized++; return {}; } },
    notificationPreferenceRepository: { isEnabled: async () => false },
  });
  const result = await service.completeLesson(userId, courseId, lessonId);
  assert.equal(result.isCompleted, false); assert.equal(issued, 0); assert.equal(finalized, 0);
});
test('completed enrollment must still pass the shared gate and cannot bypass changed results', async () => {
  let issues = 0;
  const service = new EnrollmentLifecycleService({
    enrollmentRepository: { findById: async () => ({ _id: enrollmentId, userId, courseId, status: 'completed' }) },
    certificateRepository: { findOneByCourse: async () => ({ certificateNumber: 'old' }), issueCertificate: async () => { issues++; } },
    courseRepository: { findById: async () => ({ status: 'PUBLIC' }) },
    progressTrackingService: { recalculateCourseProgress: async () => ({ eligibleToComplete: false, percentage: 70, remainingActivities: ['Quiz'] }) },
  });
  await assert.rejects(service.completeCourse(enrollmentId, { _id: userId }), e => e.status === 422);
  assert.equal(issues, 0);
});
