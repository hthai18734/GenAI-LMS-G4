module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { adminDashboardService: AdminDashboardService } = UseCases;

class AdminController {
  async getDashboardStats(req, res, next) {
    try { return ResponseUtil.success(res, { message: 'Admin dashboard statistics retrieved successfully.', data: await AdminDashboardService.getDashboard() }); }
    catch (error) { return next(error); }
  }
}
return  new AdminController();
};
