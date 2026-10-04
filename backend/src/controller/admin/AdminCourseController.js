const ResponseUtil = require('../../utils/common/ResponseUtil');
const CourseModerationService = require('../../service/admin/CourseModerationService');
const CourseQueryDTO = require('../../dto/course/CourseQueryDTO');
const RejectCourseDTO = require('../../dto/course/RejectCourseDTO');

class AdminCourseController {
  validationError(res, errors) {
    return ResponseUtil.error(res, { status: 400, message: 'Validation failed.', errors });
  }
  async listModerationQueue(req, res, next) {
    try {
      const dto = new CourseQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const result = await CourseModerationService.getModerationQueue(dto);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }
  async getForModeration(req, res, next) {
    try {
      const course = await CourseModerationService.getCourseForModeration(req.params.courseId);
      return ResponseUtil.success(res, { data: { course } });
    } catch (error) {
      return next(error);
    }
  }
  async approve(req, res, next) {
    try {
      const course = await CourseModerationService.approveCourse(req.params.courseId, req.user);
      return ResponseUtil.success(res, {
        message: 'Course approved successfully.',
        data: { course },
      });
    } catch (error) {
      return next(error);
    }
  }
  async reject(req, res, next) {
    try {
      const dto = new RejectCourseDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const course = await CourseModerationService.rejectCourse(req.params.courseId, req.user, dto);
      return ResponseUtil.success(res, { message: 'Course rejected.', data: { course } });
    } catch (error) {
      return next(error);
    }
  }
}
module.exports = new AdminCourseController();
