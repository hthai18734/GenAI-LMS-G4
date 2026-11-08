const test = require('node:test');
const assert = require('node:assert/strict');
const Course = require('../../src/model/learning/Course');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');

test('teacher course repository escapes search regex and applies defensive query bounds', async () => {
  const originals = { find: Course.find, countDocuments: Course.countDocuments };
  const observed = {};
  Course.find = (filter) => {
    observed.filter = filter;
    return {
      sort(value) { observed.sort = value; return this; },
      skip(value) { observed.skip = value; return this; },
      limit(value) { observed.limit = value; return this; },
      async exec() { return []; },
    };
  };
  Course.countDocuments = async () => 0;

  try {
    await CourseRepository.findAllByTeacher('507f1f77bcf86cd799439012', {
      search: '.*[admin]',
      page: -50,
      limit: 5000,
      sortBy: '$where',
      sortOrder: 'asc',
    });

    assert.equal(observed.filter.$or[0].title.$regex.source, '\\.\\*\\[admin\\]');
    assert.deepEqual(observed.sort, { updatedAt: -1 });
    assert.equal(observed.skip, 0);
    assert.equal(observed.limit, 100);
  } finally {
    Course.find = originals.find;
    Course.countDocuments = originals.countDocuments;
  }
});
