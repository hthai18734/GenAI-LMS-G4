const test = require('node:test');
const assert = require('node:assert/strict');
const CourseService = require('../../src/service/learning/CourseService');

function buildService(overrides = {}) {
  const calls = {};
  const service = new CourseService({
    courseRepository: {
      create: async (input) => { calls.create = input; return input; },
      findAllByTeacher: async (_teacherId, query) => { calls.query = query; return { courses: [], total: 0 }; },
      findById: async () => ({ _id: 'course-1', teacherId: 'teacher-1', status: 'DRAFT' }),
      update: async (_id, input) => { calls.update = input; return input; },
      ...overrides.courseRepository,
    },
    categoryRepository: {
      findActiveById: async () => null,
      ...overrides.categoryRepository,
    },
    lessonRepository: {
      countValidByCourseId: async () => 0,
      ...overrides.lessonRepository,
    },
    materialRepository: overrides.materialRepository || {},
    courseCleanupRepository: overrides.courseCleanupRepository || {},
  });
  return { service, calls };
}

test('course use cases accept plain validated commands and queries', async () => {
  const { service, calls } = buildService();
  const user = { _id: 'teacher-1' };

  await service.createCourse(user, { title: 'Course', description: 'Body', categoryId: null });
  assert.equal(calls.create.title, 'Course');
  assert.equal(calls.create.teacherId, 'teacher-1');

  const query = { page: 1, limit: 20, sortBy: 'updatedAt', sortOrder: 'desc' };
  await service.getTeacherCourses(user, query);
  assert.equal(calls.query, query);

  await service.updateCourse('507f1f77bcf86cd799439011', user, { title: 'Updated' });
  assert.deepEqual(calls.update, { title: 'Updated' });
});
