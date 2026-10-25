const test = require('node:test');
const assert = require('node:assert/strict');
const StudentService = require('../../src/service/student/StudentService');

const courseId = '507f1f77bcf86cd799439011';
const lessonId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439013';

function service(overrides = {}) {
  const calls = [];
  const dependencies = {
    enrollmentRepository: {
      findAccessibleEnrollment: async () => ({ _id: 'enrollment-1' }),
    },
    lessonRepository: {
      findById: async () => ({ _id: lessonId, courseId, isPublished: true, videoRef: null }),
      findFirstLesson: async (id, options) => {
        calls.push(['first', id, options]);
        return { _id: lessonId, title: 'Published lesson' };
      },
      countByCourseId: async (id, options) => {
        calls.push(['count', id, options]);
        return 1;
      },
    },
    progressRepository: {
      countByUserAndCourse: async () => 0,
      upsertProgress: async () => ({}),
    },
    videoProgressRepository: { findByStudentAndVideo: async () => null },
    certificateRepository: { issueCertificate: async () => null },
    notificationPreferenceRepository: { isEnabled: async () => false },
    notificationRepository: { create: async () => ({}) },
    ...overrides,
  };
  return { instance: new StudentService(dependencies), calls, dependencies };
}

test('student resume and completion use published lessons only', async () => {
  const { instance, calls } = service();
  const first = await instance.firstLesson(courseId);
  assert.equal(first.lessonId, lessonId);
  await instance.completeLesson(userId, courseId, lessonId);
  assert.deepEqual(calls, [
    ['first', courseId, { publishedOnly: true }],
    ['count', courseId, { publishedOnly: true }],
  ]);
});

test('student resume ignores stale progress pointing at a draft lesson', async () => {
  const { instance, calls, dependencies } = service({
    courseRepository: { findById: async () => ({ _id: courseId, title: 'Course', status: 'PUBLIC' }) },
    enrollmentRepository: {
      findForResume: async () => ({ _id: 'enrollment-1', courseId: { _id: courseId, title: 'Course' } }),
    },
    progressRepository: {
      findLastAccessedLesson: async () => ({ lessonId: { _id: '507f1f77bcf86cd799439099', title: 'Draft', isPublished: false }, status: 'in_progress' }),
    },
  });
  dependencies.lessonRepository.findFirstLesson = async (id, options) => {
    calls.push(['first', id, options]);
    return { _id: lessonId, title: 'Published lesson' };
  };
  const result = await instance.resume({ _id: userId, role: 'student' }, courseId);
  assert.equal(result.currentLesson.lessonId, lessonId);
  assert.deepEqual(calls, [['first', courseId, { publishedOnly: true }]]);
});

test('student cannot complete an unpublished lesson or a lesson from another course', async () => {
  for (const lesson of [
    { _id: lessonId, courseId, isPublished: false },
    { _id: lessonId, courseId: '507f1f77bcf86cd799439099', isPublished: true },
  ]) {
    const { instance } = service({
      lessonRepository: {
        findById: async () => lesson,
        countByCourseId: async () => 1,
      },
    });
    await assert.rejects(
      instance.completeLesson(userId, courseId, lessonId),
      (error) => error.status === 404 && error.publicMessage === 'Lesson not found or unavailable.',
    );
  }
});
