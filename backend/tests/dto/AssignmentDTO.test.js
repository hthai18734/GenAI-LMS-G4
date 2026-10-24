const test = require('node:test');
const assert = require('node:assert/strict');
const CreateAssignmentDTO = require('../../src/dto/assignment/CreateAssignmentDTO');

test('create assignment DTO accepts the supported content contract and excludes protected fields', () => {
  const dto = new CreateAssignmentDTO({
    title: '  Analysis report ',
    content: '  Submit your analysis. ',
    courseId: '507f1f77bcf86cd799439011',
    teacherId: 'another-teacher',
  });

  assert.ok(dto.validate().payload);
  assert.deepEqual(dto.toObject(), { title: 'Analysis report', content: 'Submit your analysis.', lessonId: null });
});

test('create assignment DTO rejects missing or invalid assignment content', () => {
  const dto = new CreateAssignmentDTO({ title: ' ', content: '' });
  const errors = dto.validate();

  assert.ok(errors.title);
  assert.ok(errors.content);
});

test('create assignment DTO accepts a valid lesson link and rejects an invalid one', () => {
  const lessonId = '507f1f77bcf86cd799439099';
  const valid = new CreateAssignmentDTO({ title: 'Practice', content: 'Complete it.', lessonId });
  const invalid = new CreateAssignmentDTO({ title: 'Practice', content: 'Complete it.', lessonId: 'bad-id' });

  assert.deepEqual(valid.validate(), {});
  assert.deepEqual(valid.toObject(), { title: 'Practice', content: 'Complete it.', lessonId });
  assert.ok(invalid.validate().lessonId);
});
