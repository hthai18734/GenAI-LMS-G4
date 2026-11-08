const test = require('node:test');
const assert = require('node:assert/strict');
const StudentLearningService = require('../../src/service/student/StudentLearningService');

function setup(enrolled = true, status = 'PUBLIC') {
  let reads = 0;
  const service = new StudentLearningService({
    courseRepository: { findById: async () => ({ _id: 'course', teacherId: 'teacher', status }) },
    enrollmentRepository: { findAccessibleEnrollment: async () => enrolled ? { _id: 'enrollment', status: 'active' } : null },
    lessonRepository: { findPublishedByCourseId: async () => [{ _id: 'lesson', sectionId: 'section', sectionTitle: 'Chapter', isPublished: true }] },
    sectionRepository: { findByCourseId: async courseId => { reads++; assert.equal(courseId, 'course'); return [{ _id: 'section', title: 'Chapter', description: 'Read first', order: 1 }, { _id: 'empty', title: 'Next', order: 2 }]; } },
    progressRepository: { findByUserAndCourse: async () => [] },
    progressTrackingService: { evaluateCourseProgress: async () => ({ eligibleToComplete: false }) },
  });
  return { service, reads: () => reads };
}
test('student curriculum includes safe section metadata, ordered empty sections and lesson links', async () => {
  const { service } = setup();
  const result = await service.getCourseLessons({ _id: 'student', role: 'student' }, 'course');
  assert.deepEqual(result.sections, [{ id: 'section', title: 'Chapter', description: 'Read first', order: 1 }, { id: 'empty', title: 'Next', description: '', order: 2 }]);
  assert.equal(result.lessons[0].sectionId, 'section');
});
test('unenrolled students and unpublished courses never expose section metadata', async () => {
  for (const [enrolled, status] of [[false, 'PUBLIC'], [true, 'APPROVED']]) {
    const { service, reads } = setup(enrolled, status);
    await assert.rejects(service.getCourseLessons({ _id: 'student', role: 'student' }, 'course'));
    assert.equal(reads(), 0);
  }
});
