const test = require('node:test');
const assert = require('node:assert/strict');
const CreateCourseDTO = require('../../src/dto/course/CreateCourseDTO');
const UpdateCourseDTO = require('../../src/dto/course/UpdateCourseDTO');
const RejectCourseDTO = require('../../src/dto/course/RejectCourseDTO');
const LessonDTO = require('../../src/dto/course/LessonDTO');
const CreateCategoryDTO = require('../../src/dto/category/CreateCategoryDTO');

test('create course DTO whitelists protected fields', () => {
  const dto = new CreateCourseDTO({
    title: '  Secure Course ',
    description: '  Course body ',
    duration: '2',
    teacherId: 'other-user',
    status: 'PUBLIC',
    moderatedBy: 'admin',
  });
  assert.ok(dto.validate().payload);
  assert.deepEqual(dto.toObject(), {
    title: 'Secure Course',
    description: 'Course body',
    thumbnail: null,
    category: null,
    categoryId: null,
    duration: 2,
  });
});

test('update course DTO rejects protected status updates', () => {
  const dto = new UpdateCourseDTO({ description: 'Updated', status: 'PUBLIC' });
  assert.ok(dto.validate().payload);
  assert.deepEqual(dto.toObject(), { description: 'Updated' });
});

test('reject course DTO requires a non-blank reason', () => {
  const dto = new RejectCourseDTO({ reason: '   ' });
  assert.equal(dto.validate().reason, 'A rejection reason is required.');
});

test('lesson DTO requires valid learning content', () => {
  const dto = new LessonDTO({ title: 'Introduction', content: '  ', order: 0 });
  assert.equal(dto.validate().content, 'Lesson content is required.');
  assert.equal(dto.validate().order, 'Lesson order must be an integer greater than zero.');
});

test('category DTO validates a required category name', () => {
  const dto = new CreateCategoryDTO({ name: '   ' });
  assert.equal(dto.validate().name, 'Category name is required.');
});
