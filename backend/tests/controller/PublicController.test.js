const test = require('node:test');
const assert = require('node:assert/strict');
const PublicController = require('../../src/controller/public/PublicController');
const CourseDAO = require('../../src/dao/content/CourseDAO');
const CategoryDAO = require('../../src/dao/content/CategoryDAO');
const UserDAO = require('../../src/dao/identity/UserDAO');

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

test('UC-1.1: getHomepage returns featured courses and active categories', async () => {
  const origFeatured = CourseDAO.findFeaturedCourses;
  const origCategories = CategoryDAO.findAllActive;

  CourseDAO.findFeaturedCourses = async () => [
    { _id: 'c1', title: 'Intro to AI', isFeatured: true, status: 'PUBLIC' },
  ];
  CategoryDAO.findAllActive = async () => [
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
    CourseDAO.findFeaturedCourses = origFeatured;
    CategoryDAO.findAllActive = origCategories;
  }
});

test('UC-1.2: browseCourses returns paginated course list', async () => {
  const origPaging = CourseDAO.findPublishedWithPaging;
  const origCount = CourseDAO.countPublished;

  CourseDAO.findPublishedWithPaging = async (page, limit) => [
    { _id: 'c1', title: 'Fullstack React', status: 'PUBLIC' },
  ];
  CourseDAO.countPublished = async () => 1;

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
    CourseDAO.findPublishedWithPaging = origPaging;
    CourseDAO.countPublished = origCount;
  }
});

test('UC-1.3: searchCourses rejects empty keyword with 400 Keyword required', async () => {
  const req = { query: { q: '   ' } };
  const res = createMockRes();
  await PublicController.searchCourses(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Keyword required');
});

test('UC-1.3: searchCourses returns ranked results for valid keyword', async () => {
  const origSearch = CourseDAO.searchByKeyword;

  CourseDAO.searchByKeyword = async (keyword, page, limit) => ({
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
    CourseDAO.searchByKeyword = origSearch;
  }
});

test('UC-1.4: filterAndSortCourses rejects invalid filter options', async () => {
  const req = { query: { minPrice: '100', maxPrice: '50' } };
  const res = createMockRes();
  await PublicController.filterAndSortCourses(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Invalid filter options');
});

test('UC-1.4: filterAndSortCourses returns filtered and sorted courses', async () => {
  const origFilter = CourseDAO.findByFilterAndSort;

  CourseDAO.findByFilterAndSort = async () => ({
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
    CourseDAO.findByFilterAndSort = origFilter;
  }
});

test('UC-1.5: getCourseDetail returns 404 when course not found', async () => {
  const origFind = CourseDAO.findById;
  CourseDAO.findById = async () => null;

  try {
    const req = { params: { id: 'nonexistent' } };
    const res = createMockRes();
    await PublicController.getCourseDetail(req, res, () => {});

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Course not found');
  } finally {
    CourseDAO.findById = origFind;
  }
});

test('UC-1.5: getCourseDetail returns course and instructor summary when found', async () => {
  const origFindCourse = CourseDAO.findById;
  const origFindTeacher = UserDAO.findTeacherSummaryById;

  CourseDAO.findById = async () => ({
    _id: 'c1',
    title: 'Node.js Mastery',
    instructorId: 't1',
  });
  UserDAO.findTeacherSummaryById = async () => ({
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
    CourseDAO.findById = origFindCourse;
    UserDAO.findTeacherSummaryById = origFindTeacher;
  }
});

test('UC-1.6: getPublicCategories returns active category list', async () => {
  const origCategories = CategoryDAO.findAllActive;
  CategoryDAO.findAllActive = async () => [
    { _id: 'cat1', name: 'Web Development', isActive: true },
  ];

  try {
    const req = {};
    const res = createMockRes();
    await PublicController.getPublicCategories(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.categories.length, 1);
  } finally {
    CategoryDAO.findAllActive = origCategories;
  }
});

test('UC-1.6: getPublicTeacherProfile returns 404 when teacher profile not found', async () => {
  const origTeacher = UserDAO.findPublicTeacherById;
  UserDAO.findPublicTeacherById = async () => null;

  try {
    const req = { params: { teacherId: 'unknown' } };
    const res = createMockRes();
    await PublicController.getPublicTeacherProfile(req, res, () => {});

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Teacher profile not found');
  } finally {
    UserDAO.findPublicTeacherById = origTeacher;
  }
});

test('UC-1.6: getPublicTeacherProfile returns profile and published courses', async () => {
  const origTeacher = UserDAO.findPublicTeacherById;
  const origCourses = CourseDAO.findCoursesByTeacherId;

  UserDAO.findPublicTeacherById = async () => ({
    _id: 't1',
    fullName: 'Jane Smith',
    role: 'teacher',
  });
  CourseDAO.findCoursesByTeacherId = async () => [{ _id: 'c1', title: 'Data Structures' }];

  try {
    const req = { params: { teacherId: 't1' } };
    const res = createMockRes();
    await PublicController.getPublicTeacherProfile(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.teacher.fullName, 'Jane Smith');
    assert.equal(res.body.data.publishedCourses.length, 1);
  } finally {
    UserDAO.findPublicTeacherById = origTeacher;
    CourseDAO.findCoursesByTeacherId = origCourses;
  }
});
