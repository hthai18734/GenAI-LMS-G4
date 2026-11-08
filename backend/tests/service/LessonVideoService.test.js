const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const LessonVideoService = require('../../src/service/learning/LessonVideoService');

function service({ enrollment = null, teacherId = 'teacher-1', isPublished = true, courseStatus = 'PUBLIC' } = {}) {
  return new LessonVideoService({
    lessonRepository: { findByVideoRef: async () => ({ courseId: 'course-1', isPublished }) },
    courseRepository: { findById: async () => ({ _id: 'course-1', teacherId, status: courseStatus }) },
    enrollmentRepository: { findAccessibleEnrollment: async () => enrollment },
    videoStorageGateway: {
      resolveWithin: filename => path.resolve('test-videos', filename),
    },
  });
}

test('lesson video rejects a student without accessible enrollment', async () => {
  await assert.rejects(
    service().authorize('lesson.mp4', { _id: 'student-1', role: 'student' }),
    error => error.status === 403,
  );
});

test('lesson video allows enrolled students, owning teachers and admins', async () => {
  const filename = 'lesson.mp4';
  await assert.doesNotReject(service({ enrollment: { _id: 'enrollment-1' } }).authorize(filename, { _id: 'student-1', role: 'student' }));
  await assert.doesNotReject(service().authorize(filename, { _id: 'teacher-1', role: 'teacher' }));
  await assert.doesNotReject(service().authorize(filename, { _id: 'admin-1', role: 'admin' }));
});

test('lesson video rejects unsafe filenames before repository access', async () => {
  await assert.rejects(
    service().authorize('../secret.env', { _id: 'admin-1', role: 'admin' }),
    error => error.status === 404,
  );
});

test('lesson video hides unpublished lessons from enrolled students', async () => {
  await assert.rejects(
    service({ enrollment: { _id: 'enrollment-1' }, isPublished: false })
      .authorize('draft.mp4', { _id: 'student-1', role: 'student' }),
    error => error.status === 403,
  );
});

test('lesson video is unavailable to students while the course is not public', async () => {
  await assert.rejects(
    service({ enrollment: { _id: 'enrollment-1' }, courseStatus: 'APPROVED' })
      .authorize('lesson.mp4', { _id: 'student-1', role: 'student' }),
    error => error.status === 403,
  );
});
