const test = require('node:test');
const assert = require('node:assert/strict');
const AssignmentService = require('../../src/service/learning/AssignmentService');
test('deadline closes at equality and never modifies the existing submission', async () => {
  const deadline = new Date('2026-11-10T03:00:00Z'); let writes = 0;
  const service = new AssignmentService({ assignmentRepository: { findById: async () => ({ _id: 'a', courseId: 'c', deadline }) },
    courseRepository: { findById: async () => ({ status: 'PUBLIC' }) }, enrollmentRepository: { findAccessibleEnrollment: async () => ({}) },
    assignmentSubmissionRepository: { submit: async () => { writes++; return {}; } }, clock: () => deadline });
  await assert.rejects(service.submitAssignment('a', { _id: 'u' }, 'answer'), e => e.status === 409);
  assert.equal(writes, 0);
  service.clock = () => new Date(deadline.getTime() - 1);
  await service.submitAssignment('a', { _id: 'u' }, 'answer'); assert.equal(writes, 1);
});
