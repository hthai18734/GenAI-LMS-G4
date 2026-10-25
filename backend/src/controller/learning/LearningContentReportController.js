module.exports = function createController(UseCases) {
const { learningContentReportService: LearningContentReportService } = UseCases;
const ResponseUtil = require('../../utils/common/ResponseUtil');

class LearningContentReportController {
  async createReport(req, res, next) {
    try {
      const result = await LearningContentReportService.reportIssue(req.user, req.body);
      return ResponseUtil.success(res, { data: result, status: 201, message: 'Content issue reported successfully.' });
    } catch (error) {
      return next(error);
    }
  }

  async listMyReports(req, res, next) {
    try {
      const result = await LearningContentReportService.listMyReports(req.user, req.query);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async listTeacherReports(req, res, next) {
    try {
      const result = await LearningContentReportService.listReportsForTeacher(req.user, req.query);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async getReportDetail(req, res, next) {
    try {
      const { reportId } = req.params;
      const result = await LearningContentReportService.getReportDetail(reportId, req.user);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async resolveReport(req, res, next) {
    try {
      const { reportId } = req.params;
      const result = await LearningContentReportService.resolveReport(reportId, req.user, req.body);
      return ResponseUtil.success(res, { data: result, message: 'Report status updated successfully.' });
    } catch (error) {
      return next(error);
    }
  }
}

return  new LearningContentReportController();
};
