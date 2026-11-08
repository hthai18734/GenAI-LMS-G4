const test = require('node:test');
const assert = require('node:assert/strict');
const GradebookService = require('../../src/service/learning/GradebookService');
const { evaluateCompletion } = require('../../src/domain/learning/CourseCompletionPolicy');
function make() {
  const activities = {
    lessons: [{ _id: 'l', title: 'Lesson', isPublished: true }],
    assignments: [{ _id: 'a', title: 'Task', maxScore: 10, passingScore: 5 }],
    quizzes: [{ _id: 'q', title: 'Quiz', isPublished: true, passingScore: 50 }],
  };
  return new GradebookService({
    courseService: { getOwnedCourse: async () => ({ _id: 'c', title: 'Course', gradePolicy: { quizAttempt: 'best', passingScore: 99 } }) },
    gradebookRepository: { read: async () => ({ students: [{ id: 'u', fullName: 'Student' }, { id: 'v' }], total: 2 }) },
    progressTrackingService: {
      courseActivities: async () => activities,
      evaluateCourseProgress: async studentId => evaluateCompletion({ ...activities,
        progressRecords: [{ lessonId: 'l', status: 'completed' }],
        submissions: studentId === 'u' ? [{ _id: 's', assignmentId: 'a', score: 8, maxScore: 10, status: 'passed' }] : [],
        attempts: [{ _id: '1', quizId: 'q', status: 'submitted', score: 90, submittedAt: new Date(1000) },
          { _id: '2', quizId: 'q', status: 'submitted', score: 50, submittedAt: new Date(2000) }],
      }),
    },
  });
}
test('gradebook/report share completion and latest scores, ignoring weighted policy', async () => {
  const service = make(); const result = await service.view('c', {}, { page: 1, limit: 20 });
  assert.equal(result.rows[0].result.eligibleToComplete, true);
  assert.equal(result.rows[0].result.status, 'completed');
  assert.equal(result.rows[0].cells[1].score, 50);
  assert.equal(result.rows[1].cells[0].state, 'not_submitted');
  assert.equal(result.rows[1].result.eligibleToComplete, false);
  assert.deepEqual(result.rows[1].result.remainingActivities, ['Assignment: Task']);
  assert.equal('policy' in result, false);
  assert.equal('finalGrade' in result.rows[0].result, false);
  const report = await service.report('c', {}); assert.deepEqual(report.rows, result.rows);
});
test('gradebook checks ownership before reading roster or student progress', async () => {
  const service = make(); service.courseService.getOwnedCourse = async () => { const e = new Error(); e.status = 403; throw e; };
  service.gradebookRepository.read = async () => assert.fail('Unauthorized roster read');
  await assert.rejects(service.view('c', {}, {}), e => e.status === 403);
});
test('retired weight configuration cannot change course results', async () => {
  await assert.rejects(make().configure('c', {}, { passingScore: 99 }), e => e.status === 410);
});
