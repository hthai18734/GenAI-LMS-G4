const { progressTrackingService: ProgressTrackingService } = require('../../composition/services');
const ResponseUtil = require('../../utils/common/ResponseUtil');

class ProgressTrackingController {
  async markLessonComplete(req, res, next) {
    try {
      const { lessonId } = req.params;
      const result = await ProgressTrackingService.markLessonComplete(lessonId, req.user);
      return ResponseUtil.success(res, { data: result, message: 'Lesson marked as completed.' });
    } catch (error) {
      return next(error);
    }
  }

  async viewCourseProgress(req, res, next) {
    try {
      const { courseId } = req.params;
      const result = await ProgressTrackingService.viewCourseProgress(courseId, req.user);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async heartbeat(req, res, next) {
    try {
      const { videoId } = req.params;
      const result = await ProgressTrackingService.trackVideoProgress(videoId, req.user, req.body);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async getVideoProgress(req, res, next) {
    try {
      const { videoId } = req.params;
      const result = await ProgressTrackingService.getVideoProgress(videoId, req.user);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ProgressTrackingController();
