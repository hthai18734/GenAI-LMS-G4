const ResponseUtil = require('../../utils/common/ResponseUtil');
const CourseService = require('../../service/learning/CourseService');
const CreateCourseDTO = require('../../dto/course/CreateCourseDTO');
const UpdateCourseDTO = require('../../dto/course/UpdateCourseDTO');
const CourseQueryDTO = require('../../dto/course/CourseQueryDTO');
const LessonDTO = require('../../dto/course/LessonDTO');
const CategoryService = require('../../service/learning/CategoryService');
const Course = require('../../model/learning/Course');
const Enrollment = require('../../model/learning/Enrollment');

class TeacherCourseController {
  validationError(res, errors) {
    return ResponseUtil.error(res, { status: 400, message: 'Validation failed.', errors });
  }

  async create(req, res, next) {
    try {
      const dto = new CreateCourseDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const course = await CourseService.createCourse(req.user, dto);
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Course created successfully.',
        data: { course },
      });
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const dto = new CourseQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const result = await CourseService.getTeacherCourses(req.user, dto);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async listCategories(req, res, next) {
    try {
      const categories = await CategoryService.getActiveCategories();
      return ResponseUtil.success(res, { data: { categories } });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const course = await CourseService.getTeacherCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { course } });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const dto = new UpdateCourseDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const course = await CourseService.updateCourse(req.params.courseId, req.user, dto);
      return ResponseUtil.success(res, {
        message: 'Course updated successfully.',
        data: { course },
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await CourseService.deleteCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { message: 'Course deleted successfully.' });
    } catch (error) {
      return next(error);
    }
  }

  async submitForReview(req, res, next) {
    try {
      const course = await CourseService.submitForReview(req.params.courseId, req.user);
      return ResponseUtil.success(res, {
        message: 'Course submitted for review.',
        data: { course },
      });
    } catch (error) {
      return next(error);
    }
  }

  async publish(req, res, next) {
    try {
      const course = await CourseService.publishCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, {
        message: 'Course published successfully.',
        data: { course },
      });
    } catch (error) {
      return next(error);
    }
  }

  async unpublish(req, res, next) {
    try {
      const course = await CourseService.unpublishCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, {
        message: 'Course unpublished successfully.',
        data: { course },
      });
    } catch (error) {
      return next(error);
    }
  }

  async archive(req, res, next) {
    try {
      const course = await CourseService.archiveCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, {
        message: 'Course archived successfully.',
        data: { course },
      });
    } catch (error) {
      return next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const course = await CourseService.restoreCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { message: 'Course restored to Draft.', data: { course } });
    } catch (error) {
      return next(error);
    }
  }

  async listLessons(req, res, next) {
    try {
      const lessons = await CourseService.listLessons(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { lessons } });
    } catch (error) {
      return next(error);
    }
  }

  async createLesson(req, res, next) {
    try {
      const dto = new LessonDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const lesson = await CourseService.createLesson(req.params.courseId, req.user, dto);
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Lesson created successfully.',
        data: { lesson },
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateLesson(req, res, next) {
    try {
      const dto = new LessonDTO(req.body, { partial: true });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const lesson = await CourseService.updateLesson(
        req.params.courseId,
        req.params.lessonId,
        req.user,
        dto,
      );
      return ResponseUtil.success(res, {
        message: 'Lesson updated successfully.',
        data: { lesson },
      });
    } catch (error) {
      return next(error);
    }
  }

  async deleteLesson(req, res, next) {
    try {
      await CourseService.deleteLesson(req.params.courseId, req.params.lessonId, req.user);
      return ResponseUtil.success(res, { message: 'Lesson deleted successfully.' });
    } catch (error) {
      return next(error);
    }
  }

  async uploadThumbnail(req, res) {
    if (!req.file)
      return ResponseUtil.error(res, {
        status: 400,
        message: 'A course thumbnail image is required.',
      });
    return ResponseUtil.success(res, {
      status: 201,
      message: 'Course thumbnail uploaded successfully.',
      data: { thumbnail: `/uploads/course-thumbnails/${req.file.filename}` },
    });
  }

  async getDashboard(req, res, next) {
    try {
      const teacherId = req.user._id;

      const courses = await Course.find({
        $or: [{ teacherId }, { instructorId: teacherId }],
        deletedAt: null,
      }).sort({ updatedAt: -1 });

      const courseCounts = {
        total: courses.length,
        DRAFT: 0,
        PENDING_REVIEW: 0,
        APPROVED: 0,
        REJECTED: 0,
        PUBLIC: 0,
        ARCHIVED: 0,
      };

      let totalStudentsEnrolled = 0;
      const courseIds = [];

      courses.forEach((c) => {
        if (c.status) {
          courseCounts[c.status] = (courseCounts[c.status] || 0) + 1;
        }
        totalStudentsEnrolled += c.totalStudents || 0;
        courseIds.push(c._id);
      });

      const [recentEnrollments, activeEnrollmentsCount, completedEnrollmentsCount] =
        await Promise.all([
          Enrollment.find({ courseId: { $in: courseIds } })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('userId', 'fullName email avatar')
            .populate('courseId', 'title category'),
          Enrollment.countDocuments({ courseId: { $in: courseIds }, status: 'active' }),
          Enrollment.countDocuments({ courseId: { $in: courseIds }, status: 'completed' }),
        ]);

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Teacher dashboard retrieved successfully.',
        data: {
          metrics: {
            totalCourses: courses.length,
            publishedCourses: courseCounts.PUBLIC || 0,
            pendingCourses: courseCounts.PENDING_REVIEW || 0,
            approvedCourses: courseCounts.APPROVED || 0,
            draftCourses: courseCounts.DRAFT || 0,
            rejectedCourses: courseCounts.REJECTED || 0,
            archivedCourses: courseCounts.ARCHIVED || 0,
            totalStudents:
              totalStudentsEnrolled || activeEnrollmentsCount + completedEnrollmentsCount,
            activeStudents: activeEnrollmentsCount,
            completedStudents: completedEnrollmentsCount,
          },
          courses: courses.slice(0, 5),
          recentEnrollments,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}
module.exports = new TeacherCourseController();
