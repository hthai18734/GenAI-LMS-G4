module.exports = function createController(UseCases) {
const { learningStatisticsService: LearningStatisticsService } = UseCases;
const ResponseUtil = require('../../utils/common/ResponseUtil');

class LearningStatisticsController {
  async getStatistics(req, res, next) {
    try {
      const result = await LearningStatisticsService.getLearningStatistics(req.user._id, req.query);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }
}

return  new LearningStatisticsController();
};
