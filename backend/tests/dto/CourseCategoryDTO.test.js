const test = require('node:test');
const assert = require('node:assert/strict');
const CreateCourseDTO = require('../../src/dto/course/CreateCourseDTO');
const UpdateCourseDTO = require('../../src/dto/course/UpdateCourseDTO');
const RejectCourseDTO = require('../../src/dto/course/RejectCourseDTO');
const LessonDTO = require('../../src/dto/course/LessonDTO');
const CreateCategoryDTO = require('../../src/dto/category/CreateCategoryDTO');
const UpdateAssignmentDTO = require('../../src/dto/assignment/UpdateAssignmentDTO');

test('create course DTO whitelists protected fields', () => {
  const dto = new CreateCourseDTO({
    title: '  Secure Course ', description: '  Course body ', duration: '2',
    teacherId: 'other-user', status: 'PUBLIC', moderatedBy: 'admin',
  });
  assert.ok(dto.validate().payload);
  assert.deepEqual(dto.toObject(), {
    title: 'Secure Course', description: 'Course body', thumbnail: null, category: null, categoryId: null, duration: 2,
  });
});

test('update course DTO rejects protected status updates', () => {
  const dto = new UpdateCourseDTO({ description: 'Updated', status: 'PUBLIC' });
  assert.ok(dto.validate().payload);
  assert.deepEqual(dto.toObject(), { description: 'Updated' });
});

test('course editor can save without a thumbnail and clear optional text fields', () => {
  const body = { title: 'Java Programming Fundamentals', description: 'Learn Java', categoryId: null, duration: 24, thumbnail: null };
  const dto = new UpdateCourseDTO(body);
  assert.deepEqual(dto.validate(), {});
  assert.deepEqual(dto.toObject(), body);
  assert.deepEqual(new UpdateCourseDTO({ category: null }).validate(), {});
  for (const thumbnail of [false, 12, {}, []]) {
    assert.ok(new UpdateCourseDTO({ thumbnail }).validate().thumbnail);
  }
});

test('course DTOs reject non-object payloads and unsafe numeric coercion', () => {
  assert.doesNotThrow(() => new CreateCourseDTO(null).validate());
  assert.ok(new CreateCourseDTO(null).validate().payload);
  assert.doesNotThrow(() => new UpdateCourseDTO(null).validate());
  assert.ok(new UpdateCourseDTO(null).validate().payload);

  for (const duration of [true, false, [], {}, '2 hours']) {
    assert.ok(new CreateCourseDTO({
      title: 'Course',
      description: 'Description',
      duration,
    }).validate().duration);
    assert.ok(new UpdateCourseDTO({ duration }).validate().duration);
  }

  assert.deepEqual(new CreateCourseDTO({
    title: 'Course',
    description: 'Description',
    duration: '2.5',
  }).validate(), {});
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

test('assignment update DTO supports a strict partial patch', () => {
  assert.deepEqual(new UpdateAssignmentDTO({ lessonId: null }).validate(), {});
  assert.deepEqual(new UpdateAssignmentDTO({ title: ' Updated ' }).toObject(), { title: 'Updated' });
  assert.ok(new UpdateAssignmentDTO({}).validate().payload);
  assert.ok(new UpdateAssignmentDTO({ courseId: 'forged' }).validate().payload);
  assert.ok(new UpdateAssignmentDTO({ title: 123 }).validate().title);
});
