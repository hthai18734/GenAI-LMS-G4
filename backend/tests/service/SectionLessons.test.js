const test = require('node:test');
const assert = require('node:assert/strict');
const CourseService = require('../../src/service/learning/CourseService');
const LessonManagementService = require('../../src/service/learning/LessonManagementService');
const courseId = '507f1f77bcf86cd799439011', sectionId = '507f1f77bcf86cd799439012', lessonId = '507f1f77bcf86cd799439013';
const user = { _id: '507f1f77bcf86cd799439014' };
test('new lesson preserves course and resolves its section on the server', async () => {
  const service = new CourseService({ courseRepository: { findById: async () => ({ _id: courseId, teacherId: user._id, status: 'DRAFT' }) },
    sectionService: { resolve: async (c, s) => { assert.equal(c, courseId); assert.equal(s, sectionId); return { _id: sectionId }; } },
    lessonRepository: { create: async x => x } });
  assert.equal((await service.createLesson(courseId, user, { title: 'Lesson', sectionId })).sectionId, sectionId);
  service.sectionService.resolve = async () => { const e = new Error('wrong section'); e.status = 404; throw e; };
  await assert.rejects(service.createLesson(courseId, user, { sectionId }), e => e.status === 404);
});
test('reorder requires a section when a course has multiple sections and rejects duplicate ids', async () => {
  const service = new LessonManagementService({ courseRepository: { findById: async () => ({ _id: courseId, teacherId: user._id, status: 'DRAFT' }) },
    sectionService: { resolve: async () => ({ _id: sectionId }) },
    lessonRepository: { findByCourseId: async () => [{ _id: lessonId, sectionId }, { _id: user._id, sectionId: courseId }], reorderLessons: async () => [] } });
  await assert.rejects(service.reorderLessons(courseId, user, [lessonId, user._id]), e => e.status === 400);
  await assert.rejects(service.reorderLessons(courseId, user, [lessonId, lessonId], sectionId), e => e.status === 409);
});
