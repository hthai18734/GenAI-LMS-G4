module.exports = function createController(UseCases) {
/**
Author: HuyTG - CE182405
Created at: 29/09/2026
Description: Course Management
 */
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { courseService: CourseService } = UseCases;
const CreateCourseDTO = require('../../dto/course/CreateCourseDTO');
const UpdateCourseDTO = require('../../dto/course/UpdateCourseDTO');
const CourseQueryDTO = require('../../dto/course/CourseQueryDTO');
const LessonDTO = require('../../dto/course/LessonDTO');
const { categoryService: CategoryService } = UseCases;
const { teacherDashboardService: TeacherDashboardService } = UseCases;

class TeacherCourseController {
  validationError(res, errors) { return ResponseUtil.error(res, { status: 400, message: 'Validation failed.', errors }); }

  async create(req, res, next) {
    try {
      const dto = new CreateCourseDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const course = await CourseService.createCourse(req.user, dto.toObject());
      return ResponseUtil.success(res, { status: 201, message: 'Course created successfully.', data: { course } });
    } catch (error) { return next(error); }
  }

  async list(req, res, next) {
    try {
      const dto = new CourseQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const result = await CourseService.getTeacherCourses(req.user, dto.toObject());
      return ResponseUtil.success(res, { data: result });
    } catch (error) { return next(error); }
  }

  async listCategories(req, res, next) {
    try {
      const categories = await CategoryService.getActiveCategories();
      return ResponseUtil.success(res, { data: { categories } });
    } catch (error) { return next(error); }
  }

  async getById(req, res, next) {
    try {
      const course = await CourseService.getTeacherCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { course } });
    } catch (error) { return next(error); }
  }

  async update(req, res, next) {
    try {
      const dto = new UpdateCourseDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const course = await CourseService.updateCourse(req.params.courseId, req.user, dto.toObject());
      return ResponseUtil.success(res, { message: 'Course updated successfully.', data: { course } });
    } catch (error) { return next(error); }
  }

  async remove(req, res, next) {
    try {
      await CourseService.deleteCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { message: 'Course deleted successfully.' });
    } catch (error) { return next(error); }
  }

  async submitForReview(req, res, next) {
    try {
      const course = await CourseService.submitForReview(req.params.courseId, req.user);
      return ResponseUtil.success(res, { message: 'Course submitted for review.', data: { course } });
    } catch (error) { return next(error); }
  }

  async publish(req, res, next) {
    try {
      const course = await CourseService.publishCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { message: 'Course published successfully.', data: { course } });
    } catch (error) { return next(error); }
  }

  async unpublish(req, res, next) {
    try {
      const course = await CourseService.unpublishCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { message: 'Course unpublished successfully.', data: { course } });
    } catch (error) { return next(error); }
  }

  async archive(req, res, next) {
    try {
      const course = await CourseService.archiveCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { message: 'Course archived successfully.', data: { course } });
    } catch (error) { return next(error); }
  }

  async restore(req, res, next) {
    try {
      const course = await CourseService.restoreCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, { message: 'Course restored to Draft.', data: { course } });
    } catch (error) { return next(error); }
  }

  async listLessons(req, res, next) {
    try {
      const lessons = await CourseService.listLessons(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { lessons } });
    } catch (error) { return next(error); }
  }

  async createLesson(req, res, next) {
    try {
      const dto = new LessonDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const lesson = await CourseService.createLesson(req.params.courseId, req.user, dto.toObject());
      return ResponseUtil.success(res, { status: 201, message: 'Lesson created successfully.', data: { lesson } });
    } catch (error) { return next(error); }
  }

  async updateLesson(req, res, next) {
    try {
      const dto = new LessonDTO(req.body, { partial: true });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const lesson = await CourseService.updateLesson(req.params.courseId, req.params.lessonId, req.user, dto.toObject());
      return ResponseUtil.success(res, { message: 'Lesson updated successfully.', data: { lesson } });
    } catch (error) { return next(error); }
  }

  async deleteLesson(req, res, next) {
    try {
      await CourseService.deleteLesson(req.params.courseId, req.params.lessonId, req.user);
      return ResponseUtil.success(res, { message: 'Lesson deleted successfully.' });
    } catch (error) { return next(error); }
  }

  async uploadThumbnail(req, res) {
    if (!req.file) return ResponseUtil.error(res, { status: 400, message: 'A course thumbnail image is required.' });
    return ResponseUtil.success(res, {
      status: 201,
      message: 'Course thumbnail uploaded successfully.',
      data: { thumbnail: `/uploads/course-thumbnails/${req.file.filename}` },
    });
  }

  async uploadVideo(req, res) {
    if (!req.file) return ResponseUtil.error(res, { status: 400, message: 'Please select a video file to upload.' });
    return ResponseUtil.success(res, {
      status: 201,
      message: 'Lesson video uploaded successfully.',
      data: {
        videoUrl: `/uploads/lesson-videos/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
      },
    });
  }

  async getDashboard(req, res, next) {
    try {
      return ResponseUtil.success(res, {
        status: 200,
        message: 'Teacher dashboard retrieved successfully.',
        data: await TeacherDashboardService.getDashboard(req.user._id),
      });
    } catch (error) {
      return next(error);
    }
  }
}
return  new TeacherCourseController();
};
