const TeacherQueryDTO = require('../../dto/admin/TeacherQueryDTO');
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { adminTeacherService: AdminTeacherService } = require('../../composition/services');
const { handleError } = require('../common/ControllerUtil');

class AdminTeacherController {
  async list(req, res, next) {
    try {
      const dto = new TeacherQueryDTO(req.query); const errors = dto.validate();
      if (Object.keys(errors).length) return ResponseUtil.error(res, { status: 400, message: 'Invalid query.', errors });
      return ResponseUtil.success(res, { data: await AdminTeacherService.list(dto.toObject()) });
    } catch (error) { return handleError(res, next, error); }
  }
  async detail(req, res, next) { return this.resolve(req, res, next, 'detail'); }
  async suspend(req, res, next) { return this.resolve(req, res, next, 'suspend'); }
  async unsuspend(req, res, next) { return this.resolve(req, res, next, 'unsuspend'); }
  async resolve(req, res, next, action) {
    try {
      const result = await AdminTeacherService.resolve(req.params.teacherId, action);
      return ResponseUtil.success(res, { message: result.message, data: { teacher: result.teacher } });
    } catch (error) { return handleError(res, next, error); }
  }
}
module.exports = new AdminTeacherController();
