const ResponseUtil = require('../../utils/common/ResponseUtil');
const { learningGoalService: LearningGoalService } = require('../../composition/services');

class LearningGoalController {
  async create(req, res, next) {
    try {
      const goal = await LearningGoalService.createGoal(req.user._id, req.body);
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Learning goal established successfully.',
        data: { goal },
      });
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await LearningGoalService.listGoals(req.user._id, {
        status: req.query.status,
        courseId: req.query.courseId,
        page,
        limit,
      });
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const goal = await LearningGoalService.updateGoal(
        req.user._id,
        req.params.goalId,
        req.body
      );
      return ResponseUtil.success(res, {
        message: 'Learning goal updated successfully.',
        data: { goal },
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await LearningGoalService.deleteGoal(req.user._id, req.params.goalId);
      return ResponseUtil.success(res, { message: 'Learning goal cancelled successfully.' });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new LearningGoalController();
