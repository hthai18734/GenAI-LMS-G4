const test = require('node:test');
const assert = require('node:assert/strict');
const CourseQueryDTO = require('../../src/dto/course/CourseQueryDTO');

test('course query accepts only the documented filters and sort fields', () => {
  const valid = new CourseQueryDTO({
    search: '  node.js  ',
    category: ' Programming ',
    status: 'DRAFT',
    page: '2',
    limit: '25',
    sortBy: 'title',
    sortOrder: 'asc',
  });

  assert.deepEqual(valid.validate(), {});
  assert.deepEqual(valid.toObject(), {
    search: 'node.js',
    status: 'DRAFT',
    category: 'Programming',
    page: 2,
    limit: 25,
    sortBy: 'title',
    sortOrder: 'asc',
  });

  for (const sortBy of ['$where', '__proto__', 'teacherId']) {
    assert.equal(new CourseQueryDTO({ sortBy }).validate().sortBy, 'Sort field is invalid.');
  }
  assert.match(new CourseQueryDTO({ unexpected: 'value' }).validate().payload, /Unsupported field/);
});

test('course query strictly bounds pagination and text search inputs', () => {
  const invalidQueries = [
    [{ page: '1.5' }, 'page'],
    [{ page: ['1'] }, 'page'],
    [{ page: '1000001' }, 'page'],
    [{ limit: '101' }, 'limit'],
    [{ limit: ['10'] }, 'limit'],
    [{ limit: '1e2' }, 'limit'],
    [{ search: {} }, 'search'],
    [{ search: 'x'.repeat(101) }, 'search'],
    [{ category: [] }, 'category'],
    [{ category: 'x'.repeat(101) }, 'category'],
    [{ sortOrder: ['asc'] }, 'sortOrder'],
  ];

  for (const [query, field] of invalidQueries) {
    assert.ok(new CourseQueryDTO(query).validate()[field], `${field} should be rejected`);
  }

  assert.ok(new CourseQueryDTO(null).validate().payload);
});
