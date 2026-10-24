const ResponseUtil = require('../../utils/common/ResponseUtil');
const { adminDashboardService: AdminDashboardService } = require('../../composition/services');
const { teacherApplicationService: TeacherApplicationService } = require('../../composition/services');
const TeacherApplicationQueryDTO = require('../../dto/admin/TeacherApplicationQueryDTO');
const ApproveTeacherApplicationDTO = require('../../dto/admin/ApproveTeacherApplicationDTO');
const RejectTeacherApplicationDTO = require('../../dto/admin/RejectTeacherApplicationDTO');
const { handleError } = require('../common/ControllerUtil');

class AdminController {
  validationError(res, errors, defaultMessage = 'Validation failed.') {
    return ResponseUtil.error(res, { status: 400, message: Object.values(errors)[0] || defaultMessage, errors });
  }
  async getTeacherApplications(req, res, next) {
    try {
      const dto = new TeacherApplicationQueryDTO(req.query); const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      return ResponseUtil.success(res, { message: 'Teacher applications retrieved successfully.', data: await TeacherApplicationService.list(dto.toObject().status) });
    } catch (error) { return handleError(res, next, error); }
  }
  async approveTeacherApplication(req, res, next) {
    try {
      const dto = new ApproveTeacherApplicationDTO(req.params, req.user); const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      return ResponseUtil.success(res, { message: 'Approve success', data: await TeacherApplicationService.approve(dto.toObject()) });
    } catch (error) { return handleError(res, next, error); }
  }
  async rejectTeacherApplication(req, res, next) {
    try {
      const dto = new RejectTeacherApplicationDTO(req.params, req.body, req.user); const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      return ResponseUtil.success(res, { message: 'Reject success', data: await TeacherApplicationService.reject(dto.toObject()) });
    } catch (error) { return handleError(res, next, error); }
  }
  validateRejectReason(reason) {
    return new RejectTeacherApplicationDTO({ id: 'dummy' }, { reason }).validate().reason || null;
  }
  async getDashboardStats(req, res, next) {
    try { return ResponseUtil.success(res, { message: 'Admin dashboard statistics retrieved successfully.', data: await AdminDashboardService.getDashboard() }); }
    catch (error) { return next(error); }
  }
}
module.exports = new AdminController();
