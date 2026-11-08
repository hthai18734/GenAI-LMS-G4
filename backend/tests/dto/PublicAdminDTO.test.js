/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Unit Tests for Public Course DTOs
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const HomepageQueryDTO = require('../../src/dto/public/HomepageQueryDTO');
const BrowseCoursesQueryDTO = require('../../src/dto/public/BrowseCoursesQueryDTO');
const SearchCoursesQueryDTO = require('../../src/dto/public/SearchCoursesQueryDTO');
const FilterCoursesQueryDTO = require('../../src/dto/public/FilterCoursesQueryDTO');
const CourseDetailQueryDTO = require('../../src/dto/public/CourseDetailQueryDTO');
const TeacherProfileQueryDTO = require('../../src/dto/public/TeacherProfileQueryDTO');


// ─── UC-1.1: HomepageQueryDTO ───────────────────────────────────────
test('HomepageQueryDTO accepts valid limit and clamps to max', () => {
  const dto = new HomepageQueryDTO({ limit: '8' });
  assert.deepEqual(dto.validate(), {});
  assert.equal(dto.toObject().limit, 8);

  const defaultDto = new HomepageQueryDTO({});
  assert.equal(defaultDto.toObject().limit, 6);
});

test('HomepageQueryDTO rejects invalid limit', () => {
  const dto = new HomepageQueryDTO({ limit: '-5' });
  assert.equal(dto.validate().limit, 'Limit must be an integer greater than zero.');
});

// ─── UC-1.2: BrowseCoursesQueryDTO ──────────────────────────────────
test('BrowseCoursesQueryDTO parses page and limit correctly', () => {
  const dto = new BrowseCoursesQueryDTO({ page: '2', limit: '15' });
  assert.deepEqual(dto.validate(), {});
  assert.deepEqual(dto.toObject(), { page: 2, limit: 15 });
});

test('BrowseCoursesQueryDTO rejects negative page or limit', () => {
  const dto = new BrowseCoursesQueryDTO({ page: '0', limit: 'abc' });
  const errors = dto.validate();
  assert.ok(errors.page);
  assert.ok(errors.limit);
});

// ─── UC-1.3: SearchCoursesQueryDTO ──────────────────────────────────
test('SearchCoursesQueryDTO requires non-blank keyword with min length 2', () => {
  const emptyDto = new SearchCoursesQueryDTO({ q: '   ' });
  assert.equal(emptyDto.validate().keyword, 'Keyword required');

  const shortDto = new SearchCoursesQueryDTO({ q: 'a' });
  assert.equal(shortDto.validate().keyword, 'Keyword must be at least 2 characters long');

  const validDto = new SearchCoursesQueryDTO({ q: '  Node.js  ', page: 1, limit: 10 });
  assert.deepEqual(validDto.validate(), {});
  assert.equal(validDto.toObject().keyword, 'Node.js');
});

// ─── UC-1.4: FilterCoursesQueryDTO ──────────────────────────────────
test('FilterCoursesQueryDTO rejects minPrice > maxPrice', () => {
  const dto = new FilterCoursesQueryDTO({ minPrice: '100', maxPrice: '50' });
  assert.equal(dto.validate().priceRange, 'Invalid filter options');
});

test('FilterCoursesQueryDTO rejects invalid sort option', () => {
  const dto = new FilterCoursesQueryDTO({ sort: 'unsupported-sort' });
  assert.equal(dto.validate().sort, 'Invalid filter options');
});

test('FilterCoursesQueryDTO normalizes valid sort and prices', () => {
  const dto = new FilterCoursesQueryDTO({
    minPrice: '10',
    maxPrice: '100',
    sort: 'price_asc',
    category: ' programming ',
  });
  assert.deepEqual(dto.validate(), {});
  const obj = dto.toObject();
  assert.equal(obj.minPrice, 10);
  assert.equal(obj.maxPrice, 100);
  assert.equal(obj.sortBy, 'price-asc');
  assert.equal(obj.category, 'programming');
});

// ─── UC-1.5: CourseDetailQueryDTO ───────────────────────────────────
test('CourseDetailQueryDTO validates courseId presence', () => {
  const invalidDto = new CourseDetailQueryDTO({});
  assert.equal(invalidDto.validate().courseId, 'Course ID is required.');

  const validDto = new CourseDetailQueryDTO({ id: 'c123' });
  assert.deepEqual(validDto.validate(), {});
  assert.equal(validDto.toObject().courseId, 'c123');
});

// ─── UC-1.6: TeacherProfileQueryDTO ─────────────────────────────────
test('TeacherProfileQueryDTO validates teacherId presence', () => {
  const invalidDto = new TeacherProfileQueryDTO({});
  assert.equal(invalidDto.validate().teacherId, 'Teacher ID is required.');

  const validDto = new TeacherProfileQueryDTO({ teacherId: 't456' });
  assert.deepEqual(validDto.validate(), {});
  assert.equal(validDto.toObject().teacherId, 't456');
});
