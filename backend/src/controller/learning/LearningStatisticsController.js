const { learningStatisticsService: LearningStatisticsService } = require('../../composition/services');
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

module.exports = new LearningStatisticsController();
