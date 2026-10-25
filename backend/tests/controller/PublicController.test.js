const test = require('node:test');
const assert = require('node:assert/strict');
const PublicController = require('../../src/controller/public/PublicController');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/content/CourseRepository');
const CategoryRepository = require('../../src/infrastructure/persistence/mongoose/repositories/content/CategoryRepository');
const UserRepository = require('../../src/infrastructure/persistence/mongoose/repositories/identity/UserRepository');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

// ─── UC-1.1: View Homepage ──────────────────────────────────────────
test('UC-1.1: getHomepage returns featured courses and active categories', async () => {
  const origFeatured = CourseRepository.findFeaturedCourses;
  const origCategories = CategoryRepository.findAllActive;

  CourseRepository.findFeaturedCourses = async () => [
    { _id: 'c1', title: 'Intro to AI', isFeatured: true, status: 'PUBLIC' },
  ];
  CategoryRepository.findAllActive = async () => [
    { _id: 'cat1', name: 'Computer Science', isActive: true },
  ];

  try {
    const req = { query: {} };
    const res = createMockRes();
    await PublicController.getHomepage(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.featuredCourses.length, 1);
    assert.equal(res.body.data.categories.length, 1);
    assert.ok(res.body.data.banner);
  } finally {
    CourseRepository.findFeaturedCourses = origFeatured;
    CategoryRepository.findAllActive = origCategories;
  }
});

// ─── UC-1.2: Browse Courses ─────────────────────────────────────────
test('UC-1.2: browseCourses returns paginated course list', async () => {
  const origPaging = CourseRepository.findPublishedWithPaging;
  const origCount = CourseRepository.countPublished;

  CourseRepository.findPublishedWithPaging = async (page, limit) => [
    { _id: 'c1', title: 'Fullstack React', status: 'PUBLIC' },
  ];
  CourseRepository.countPublished = async () => 1;

  try {
    const req = { query: { page: '1', limit: '10' } };
    const res = createMockRes();
    await PublicController.browseCourses(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.courses.length, 1);
    assert.equal(res.body.data.pagination.total, 1);
    assert.equal(res.body.data.pagination.page, 1);
  } finally {
    CourseRepository.findPublishedWithPaging = origPaging;
    CourseRepository.countPublished = origCount;
  }
});

// ─── UC-1.3: Search Courses ─────────────────────────────────────────
test('UC-1.3: searchCourses rejects empty keyword with 400 Keyword required', async () => {
  const req = { query: { q: '   ' } };
  const res = createMockRes();
  await PublicController.searchCourses(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Keyword required');
});

test('UC-1.3: searchCourses returns ranked results for valid keyword', async () => {
  const origSearch = CourseRepository.searchByKeyword;

  CourseRepository.searchByKeyword = async (keyword, page, limit) => ({
    courses: [{ _id: 'c1', title: 'Machine Learning', description: 'ML course' }],
    total: 1,
  });

  try {
    const req = { query: { q: 'Machine', page: 1, limit: 10 } };
    const res = createMockRes();
    await PublicController.searchCourses(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.courses.length, 1);
    assert.equal(res.body.data.courses[0].title, 'Machine Learning');
  } finally {
    CourseRepository.searchByKeyword = origSearch;
  }
});

// ─── UC-1.4: Filter & Sort Courses ──────────────────────────────────
test('UC-1.4: filterAndSortCourses rejects invalid filter options', async () => {
  const req = { query: { minPrice: '100', maxPrice: '50' } }; // min > max
  const res = createMockRes();
  await PublicController.filterAndSortCourses(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Invalid filter options');
});

test('UC-1.4: filterAndSortCourses returns filtered and sorted courses', async () => {
  const origFilter = CourseRepository.findByFilterAndSort;

  CourseRepository.findByFilterAndSort = async () => ({
    courses: [{ _id: 'c1', title: 'Python Basics', price: 0 }],
    total: 1,
  });

  try {
    const req = { query: { minPrice: '0', maxPrice: '50', sort: 'newest' } };
    const res = createMockRes();
    await PublicController.filterAndSortCourses(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.courses.length, 1);
  } finally {
    CourseRepository.findByFilterAndSort = origFilter;
  }
});

// ─── UC-1.5: View Course Detail ─────────────────────────────────────
test('UC-1.5: getCourseDetail returns 404 when course not found', async () => {
  const origFind = CourseRepository.findById;
  CourseRepository.findById = async () => null;

  try {
    const req = { params: { id: 'nonexistent' } };
    const res = createMockRes();
    await PublicController.getCourseDetail(req, res, () => {});

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Course not found');
  } finally {
    CourseRepository.findById = origFind;
  }
});

test('UC-1.5: getCourseDetail returns course and instructor summary when found', async () => {
  const origFindCourse = CourseRepository.findById;
  const origFindTeacher = UserRepository.findTeacherSummaryById;

  CourseRepository.findById = async () => ({
    _id: 'c1',
    title: 'Node.js Mastery',
    instructorId: 't1',
  });
  UserRepository.findTeacherSummaryById = async () => ({
    _id: 't1',
    fullName: 'Dr. John Doe',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Senior Backend Engineer',
  });

  try {
    const req = { params: { id: 'c1' } };
    const res = createMockRes();
    await PublicController.getCourseDetail(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.course.title, 'Node.js Mastery');
    assert.equal(res.body.data.instructor.fullName, 'Dr. John Doe');
  } finally {
    CourseRepository.findById = origFindCourse;
    UserRepository.findTeacherSummaryById = origFindTeacher;
  }
});

// ─── UC-1.6: View Public Categories & Teacher Profile ────────────────
test('UC-1.6: getPublicCategories returns active category list', async () => {
  const origCategories = CategoryRepository.findAllActive;
  CategoryRepository.findAllActive = async () => [
    { _id: 'cat1', name: 'Web Development', isActive: true },
  ];

  try {
    const req = {};
    const res = createMockRes();
    await PublicController.getPublicCategories(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.categories.length, 1);
  } finally {
    CategoryRepository.findAllActive = origCategories;
  }
});

test('UC-1.6: getPublicTeacherProfile returns 404 when teacher profile not found', async () => {
  const origTeacher = UserRepository.findPublicTeacherById;
  UserRepository.findPublicTeacherById = async () => null;

  try {
    const req = { params: { teacherId: 'unknown' } };
    const res = createMockRes();
    await PublicController.getPublicTeacherProfile(req, res, () => {});

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Teacher profile not found');
  } finally {
    UserRepository.findPublicTeacherById = origTeacher;
  }
});

test('UC-1.6: getPublicTeacherProfile returns profile and published courses', async () => {
  const origTeacher = UserRepository.findPublicTeacherById;
  const origCourses = CourseRepository.findCoursesByTeacherId;

  UserRepository.findPublicTeacherById = async () => ({
    _id: 't1',
    fullName: 'Jane Smith',
    role: 'teacher',
  });
  CourseRepository.findCoursesByTeacherId = async () => [
    { _id: 'c1', title: 'Data Structures' },
  ];

  try {
    const req = { params: { teacherId: 't1' } };
    const res = createMockRes();
    await PublicController.getPublicTeacherProfile(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.teacher.fullName, 'Jane Smith');
    assert.equal(res.body.data.publishedCourses.length, 1);
  } finally {
    UserRepository.findPublicTeacherById = origTeacher;
    CourseRepository.findCoursesByTeacherId = origCourses;
  }
});
