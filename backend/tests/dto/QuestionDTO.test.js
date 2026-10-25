const test = require('node:test');
const assert = require('node:assert/strict');
const CreateQuestionDTO = require('../../src/dto/question/CreateQuestionDTO');
const UpdateQuestionDTO = require('../../src/dto/question/UpdateQuestionDTO');

test('create question DTO normalizes a valid multiple-choice question', () => {
  const dto = new CreateQuestionDTO({
    questionText: '  Which runtime is used? ',
    options: [' Browser ', ' Node.js ', ''],
    correctAnswer: ' Node.js ',
  });
  const errors = dto.validate();

  assert.ok(errors.options);

  const valid = new CreateQuestionDTO({
    questionText: '  Which runtime is used? ',
    options: [' Browser ', ' Node.js '],
    correctAnswer: ' Node.js ',
  });
  assert.deepEqual(valid.validate(), {});
  assert.deepEqual(valid.toObject(), {
    questionText: 'Which runtime is used?', options: ['Browser', 'Node.js'], correctAnswer: 'Node.js',
  });
});

test('create question DTO rejects invalid question content and protected fields', () => {
  const dto = new CreateQuestionDTO({
    questionText: '', options: ['Only one'], correctAnswer: 'Missing', quizId: 'forged',
  });
  const errors = dto.validate();

  assert.ok(errors.payload);
  assert.ok(errors.questionText);
  assert.ok(errors.options);
  assert.ok(errors.correctAnswer);
});

test('update question DTO permits partial changes but validates option structure', () => {
  const valid = new UpdateQuestionDTO({ correctAnswer: 'B' });
  assert.deepEqual(valid.validate(), {});
  assert.deepEqual(valid.toObject(), { correctAnswer: 'B' });

  const invalid = new UpdateQuestionDTO({ options: ['A'] });
  assert.ok(invalid.validate().options);
});

test('question DTOs accept an optional category but reject forged ownership and invalid IDs', () => {
  const categoryId = '507f1f77bcf86cd799439011';
  const body = { questionText: '1+1?', options: ['2', '3'], correctAnswer: '2', categoryId };
  const create = new CreateQuestionDTO(body);
  assert.deepEqual(create.validate(), {});
  assert.equal(create.toObject().categoryId, categoryId);
  const update = new UpdateQuestionDTO({ categoryId: null });
  assert.deepEqual(update.validate(), {});
  assert.equal(update.toObject().categoryId, null);
  for (const DTO of [CreateQuestionDTO, UpdateQuestionDTO]) {
    assert.ok(new DTO({ ...body, categoryId: 'invalid' }).validate().categoryId);
    assert.ok(new DTO({ ...body, ownerTeacherId: categoryId }).validate().payload);
  }
});
