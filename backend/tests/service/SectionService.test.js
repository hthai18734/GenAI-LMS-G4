const test = require('node:test');
const assert = require('node:assert/strict');
const SectionService = require('../../src/service/learning/SectionService');
const courseId = '507f1f77bcf86cd799439011';
const sectionId = '507f1f77bcf86cd799439012';
const teacher = { _id: '507f1f77bcf86cd799439013' };
function service(overrides = {}) {
  return new SectionService({ courseRepository: { findById: async () => ({ _id: courseId, teacherId: teacher._id, status: 'DRAFT' }) },
    sectionRepository: { create: async data => data, nextOrder: async () => 3, findByCourseId: async () => [],
      findById: async () => ({ _id: sectionId, courseId }), ensureDefault: async () => ({ _id: sectionId, courseId }) }, ...overrides });
}
test('create section derives course and appends order after ownership validation', async () => {
  assert.deepEqual(await service().create(courseId, teacher, { title: 'Chapter' }), { courseId, title: 'Chapter', description: '', order: 3 });
});
test('foreign owner and public course cannot create sections', async () => {
  for (const course of [{ teacherId: sectionId, status: 'DRAFT' }, { teacherId: teacher._id, status: 'PUBLIC' }]) {
    await assert.rejects(service({ courseRepository: { findById: async () => course } }).create(courseId, teacher, { title: 'Chapter' }), e => [403, 409].includes(e.status));
  }
});
test('lesson section must exist and belong to the selected course', async () => {
  const sections = { findById: async () => ({ _id: sectionId, courseId: teacher._id }) };
  await assert.rejects(service({ sectionRepository: sections }).resolve(courseId, sectionId), e => e.status === 404);
  sections.findById = async () => null;
  await assert.rejects(service({ sectionRepository: sections }).resolve(courseId, sectionId), e => e.status === 404);
  assert.equal(String((await service().resolve(courseId, null))._id), sectionId);
});
