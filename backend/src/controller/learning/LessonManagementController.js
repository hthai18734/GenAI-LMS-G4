module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { lessonManagementService: LessonManagementService } = UseCases;

class LessonManagementController {
  async create(req, res, next) {
    try {
      const lesson = await LessonManagementService.createLesson(req.params.courseId, req.user, req.body);
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Lesson created successfully.',
        data: { lesson },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getDetail(req, res, next) {
    try {
      const result = await LessonManagementService.getLessonDetail(req.params.courseId, req.params.lessonId, req.user);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const lesson = await LessonManagementService.updateLesson(req.params.lessonId, req.user, req.body);
      return ResponseUtil.success(res, {
        message: 'Lesson updated successfully.',
        data: { lesson },
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await LessonManagementService.deleteLesson(req.params.lessonId, req.user);
      return ResponseUtil.success(res, { message: 'Lesson deleted successfully.' });
    } catch (error) {
      return next(error);
    }
  }

  async reorder(req, res, next) {
    try {
      const lessons = await LessonManagementService.reorderLessons(
        req.params.courseId,
        req.user,
        req.body.orderedLessonIds
      );
      return ResponseUtil.success(res, {
        message: 'Lessons reordered successfully.',
        data: { lessons },
      });
    } catch (error) {
      return next(error);
    }
  }

  async recordAccess(req, res, next) {
    try {
      const result = await LessonManagementService.recordAccess(req.params.lessonId, req.user);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }
}

return  new LessonManagementController();
};
