const CourseDAO = require('../../dao/content/CourseDAO');
const CategoryDAO = require('../../dao/content/CategoryDAO');
const UserDAO = require('../../dao/identity/UserDAO');
const PaginationUtil = require('../../utils/common/PaginationUtil');
const ResponseUtil = require('../../utils/common/ResponseUtil');

const HomepageQueryDTO = require('../../dto/public/HomepageQueryDTO');
const BrowseCoursesQueryDTO = require('../../dto/public/BrowseCoursesQueryDTO');
const SearchCoursesQueryDTO = require('../../dto/public/SearchCoursesQueryDTO');
const FilterCoursesQueryDTO = require('../../dto/public/FilterCoursesQueryDTO');
const CourseDetailQueryDTO = require('../../dto/public/CourseDetailQueryDTO');
const TeacherProfileQueryDTO = require('../../dto/public/TeacherProfileQueryDTO');

class PublicController {
  /**
   * Helper: Standardize validation errors response with first message priority
   */
  validationError(res, errors, defaultMessage = 'Validation failed.') {
    const firstErrorMessage = Object.values(errors)[0] || defaultMessage;
    return ResponseUtil.error(res, { status: 400, message: firstErrorMessage, errors });
  }

  /**
   * UC-1.1: View Homepage
   * Load homepage -> display featured courses and banner and active categories
   */
  async getHomepage(req, res, next) {
    try {
      const dto = new HomepageQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const { limit } = dto.toObject();
      const [featuredCourses, categories, teachers] = await Promise.all([
        CourseDAO.findFeaturedCourses(limit),
        CategoryDAO.findAllActive(),
        typeof UserDAO.findTopTeachers === 'function' ? UserDAO.findTopTeachers(4).catch(() => []) : Promise.resolve([]),
      ]);

      const banner = {
        title: 'Master New Skills with AI-Powered Learning',
        subtitle: 'Personalized courses, interactive exercises, and intelligent AI assistance designed for your success.',
        ctaText: 'Explore Courses',
        ctaLink: '/explore',
      };

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Homepage data retrieved successfully.',
        data: {
          banner,
          featuredCourses,
          categories,
          teachers,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * UC-1.2: Browse Courses
   * Load public course list with pagination
   */
  async browseCourses(req, res, next) {
    try {
      const dto = new BrowseCoursesQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const { page, limit } = dto.toObject();
      const pagination = PaginationUtil.getPagination(page, limit);

      const [courses, totalRecords] = await Promise.all([
        CourseDAO.findPublishedWithPaging(pagination.page, pagination.limit),
        CourseDAO.countPublished(),
      ]);

      const responsePayload = PaginationUtil.formatPaginatedResponse(
        courses,
        totalRecords,
        pagination.page,
        pagination.limit
      );

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Courses retrieved successfully.',
        data: responsePayload,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * UC-1.3: Search Courses
   * Search courses by keyword with validation and ranked results
   */
  async searchCourses(req, res, next) {
    try {
      const dto = new SearchCoursesQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const { keyword, page, limit } = dto.toObject();
      const pagination = PaginationUtil.getPagination(page, limit);

      const { courses, total } = await CourseDAO.searchByKeyword(
        keyword,
        pagination.page,
        pagination.limit
      );

      const responsePayload = PaginationUtil.formatPaginatedResponse(
        courses,
        total,
        pagination.page,
        pagination.limit
      );

      return ResponseUtil.success(res, {
        status: 200,
        message: courses.length > 0 ? 'Search results retrieved.' : 'No courses found matching your query.',
        data: responsePayload,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Helper: Validate keyword for search (kept for backwards compatibility)
   */
  validateKeyword(keyword) {
    const dto = new SearchCoursesQueryDTO({ q: keyword });
    const errors = dto.validate();
    return errors.keyword || null;
  }

  /**
   * UC-1.4: Filter & Sort Courses
   * Filter by category/price and sort results
   */
  async filterAndSortCourses(req, res, next) {
    try {
      const dto = new FilterCoursesQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const {
        category,
        categoryId,
        minPrice,
        maxPrice,
        sortBy,
        page,
        limit,
      } = dto.toObject();

      const pagination = PaginationUtil.getPagination(page, limit);

      const { courses, total } = await CourseDAO.findByFilterAndSort({
        categoryId,
        category,
        minPrice,
        maxPrice,
        sortBy,
        page: pagination.page,
        limit: pagination.limit,
      });

      const responsePayload = PaginationUtil.formatPaginatedResponse(
        courses,
        total,
        pagination.page,
        pagination.limit
      );

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Filtered courses retrieved successfully.',
        data: responsePayload,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Helper: Validate filter and sort parameters (kept for backwards compatibility)
   */
  validateFilterParams(params = {}) {
    const dto = new FilterCoursesQueryDTO(params);
    const errors = dto.validate();
    return Object.values(errors)[0] || null;
  }

  /**
   * UC-1.5: View Course Detail
   * View details of a specific course + teacher summary
   */
  async getCourseDetail(req, res, next) {
    try {
      const dto = new CourseDetailQueryDTO(req.params);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const { courseId } = dto.toObject();
      const course = await CourseDAO.findById(courseId);

      if (!course) {
        return ResponseUtil.error(res, { status: 404, message: 'Course not found' });
      }

      const instructorId = course.instructorId || course.teacherId;
      let instructor = null;
      if (instructorId) {
        instructor = await UserDAO.findTeacherSummaryById(instructorId);
      }

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Course details retrieved successfully.',
        data: {
          course,
          instructor: instructor || {
            fullName: 'Course Instructor',
            avatar: null,
            bio: 'Expert educator on AI-LMS',
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * UC-1.6: View Public Categories
   */
  async getPublicCategories(req, res, next) {
    try {
      const categories = await CategoryDAO.findAllActive();
      return ResponseUtil.success(res, {
        status: 200,
        message: 'Categories retrieved successfully.',
        data: { categories },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * UC-1.6 / UC-1.7: View Public Teacher Profile
   * Public teacher profile + teaching courses
   */
  async getPublicTeacherProfile(req, res, next) {
    try {
      const dto = new TeacherProfileQueryDTO(req.params);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const { teacherId } = dto.toObject();
      const teacher = await UserDAO.findPublicTeacherById(teacherId);

      if (!teacher) {
        return ResponseUtil.error(res, { status: 404, message: 'Teacher profile not found' });
      }

      const publishedCourses = await CourseDAO.findCoursesByTeacherId(teacherId);

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Teacher profile retrieved successfully.',
        data: {
          teacher,
          publishedCourses,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PublicController();
