const PaginationUtil = require('../../domain/common/PaginationPolicy');
const ServiceError = require('../common/ServiceError');

const BANNER = Object.freeze({
  title: 'Master New Skills with AI-Powered Learning',
  subtitle: 'Personalized courses, interactive exercises, and intelligent AI assistance designed for your success.',
  ctaText: 'Explore Courses',
  ctaLink: '/explore',
});

class PublicCatalogService {
  constructor({ courseRepository, categoryRepository, userRepository } = {}) {
    this.courseRepository = courseRepository;
    this.categoryRepository = categoryRepository;
    this.userRepository = userRepository;
  }
  async getHomepage({ limit }) {
    const [featuredCourses, categories, teachers] = await Promise.all([
      this.courseRepository.findFeaturedCourses(limit), this.categoryRepository.findAllActive(), this.userRepository.findTopTeachers(4).catch(() => []),
    ]);
    return { banner: BANNER, featuredCourses, categories, teachers };
  }
  async browse({ page, limit }) {
    const pagination = PaginationUtil.getPagination(page, limit);
    const [courses, total] = await Promise.all([this.courseRepository.findPublishedWithPaging(pagination.page, pagination.limit), this.courseRepository.countPublished()]);
    return PaginationUtil.formatPaginatedResponse(courses, total, pagination.page, pagination.limit);
  }
  async search({ keyword, page, limit }) {
    const pagination = PaginationUtil.getPagination(page, limit);
    const { courses, total } = await this.courseRepository.searchByKeyword(keyword, pagination.page, pagination.limit);
    return { data: PaginationUtil.formatPaginatedResponse(courses, total, pagination.page, pagination.limit), message: courses.length ? 'Search results retrieved.' : 'No courses found matching your query.' };
  }
  async filter(input) {
    const pagination = PaginationUtil.getPagination(input.page, input.limit);
    const { courses, total } = await this.courseRepository.findByFilterAndSort({ ...input, page: pagination.page, limit: pagination.limit });
    return PaginationUtil.formatPaginatedResponse(courses, total, pagination.page, pagination.limit);
  }
  async getCourseDetail(courseId) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new ServiceError(404, 'Course not found');
    const instructorId = course.instructorId || course.teacherId;
    const instructor = instructorId ? await this.userRepository.findTeacherSummaryById(instructorId) : null;
    return { course, instructor: instructor || { fullName: 'Course Instructor', avatar: null, bio: 'Expert educator on AI-LMS' } };
  }
  async getCategories() { return { categories: await this.categoryRepository.findAllActive() }; }
  async getTeacherProfile(teacherId) {
    const teacher = await this.userRepository.findPublicTeacherById(teacherId);
    if (!teacher) throw new ServiceError(404, 'Teacher profile not found');
    return { teacher, publishedCourses: await this.courseRepository.findCoursesByTeacherId(teacherId) };
  }
}
module.exports = PublicCatalogService;
