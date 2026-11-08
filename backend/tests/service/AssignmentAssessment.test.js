const test = require('node:test');
const assert = require('node:assert/strict');
const Settings = require('../../src/dto/assignment/AssignmentSettingsDTO');
const AssessmentService = require('../../src/service/learning/AssignmentAssessmentService');
test('deadline requires an explicit offset and normalizes equivalent instants', () => {
  assert.ok(new Settings({ deadline: '2026-11-10T10:00' }).validate().deadline);
  assert.ok(new Settings({ deadline: '2026-02-30T10:00:00Z' }).validate().deadline);
  assert.ok(new Settings({ maxScore: 0.0000001 }).validate().maxScore);
  const dto = new Settings({ deadline: '2026-11-10T10:00:00+07:00', maxScore: 10, passingScore: 5 });
  assert.deepEqual(dto.validate(), {});
  assert.equal(dto.toObject().deadline, '2026-11-10T03:00:00.000Z');
  assert.ok(new Settings({ maxScore: 10, passingScore: 11 }).validate().passingScore);
});
function make() {
  const submission = { _id: 's', assignmentId: 'a', courseId: 'c', studentId: 'u', revision: 2, score: null, status: 'submitted' };
  return new AssessmentService({ assignmentRepository: { findById: async () => ({ _id: 'a', courseId: 'c', maxScore: 10, passingScore: 5 }), lockScale: async () => true },
    assignmentSubmissionRepository: { findById: async () => submission, assess: async (_id, revision, data) => { assert.equal(revision, 2); return { ...submission, ...data }; } },
    courseService: { getOwnedCourse: async () => ({}) }, progressTrackingService: { recalculateCourseProgress: async () => {} } });
}
test('zero is a grade, out-of-scale/non-number grades and stale edits are rejected', async () => {
  const service = make();
  assert.equal((await service.grade('s', { _id: 't' }, { score: 0, revision: 2 })).score, 0);
  for (const score of [-1, 11, '5', NaN]) await assert.rejects(service.grade('s', { _id: 't' }, { score, revision: 2 }), e => e.status === 400);
  await assert.rejects(service.grade('s', {}, { score: 5, revision: 1 }), e => e.status === 409);
});
test('feedback alone preserves grading fields and checks ownership', async () => {
  const service = make();
  const row = await service.feedback('s', { _id: 't' }, { feedback: 'Useful feedback', revision: 2 });
  assert.equal(row.score, null); assert.equal(row.status, 'submitted');
  service.courseService.getOwnedCourse = async () => { const e = new Error(); e.status = 403; throw e; };
  await assert.rejects(service.feedback('s', {}, { feedback: 'x', revision: 2 }), e => e.status === 403);
});
