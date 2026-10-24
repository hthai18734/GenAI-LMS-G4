const ResponseUtil = require('../../utils/common/ResponseUtil');
const { USER_ROLES } = require('../../domain/identity/UserPolicy');
const UserQueryDTO = require('../../dto/admin/UserQueryDTO');
const UserWriteDTO = require('../../dto/admin/UserWriteDTO');
const { accountService: AccountService } = require('../../composition/services');
const { handleError } = require('../common/ControllerUtil');

class AccountController {
  validationError(res, errors) { return ResponseUtil.error(res, { status: 400, message: 'Validation failed.', errors }); }
  async respond(res, next, action, options = {}) {
    try { return ResponseUtil.success(res, { ...options, data: await action() }); }
    catch (error) { return handleError(res, next, error); }
  }
  async list(req, res, next) {
    const dto = new UserQueryDTO(req.query); const errors = dto.validate();
    if (Object.keys(errors).length) return this.validationError(res, errors);
    return this.respond(res, next, () => AccountService.list(dto.toObject()));
  }
  async getById(req, res, next) { return this.respond(res, next, () => AccountService.getById(req.params.userId)); }
  async create(req, res, next) {
    const dto = new UserWriteDTO(req.body, true); const errors = dto.validate();
    if (Object.keys(errors).length) return this.validationError(res, errors);
    return this.respond(res, next, () => AccountService.create(dto.toObject(), req.body.password), { status: 201, message: 'User created successfully.' });
  }
  async update(req, res, next) {
    const dto = new UserWriteDTO(req.body); const errors = dto.validate();
    if (Object.keys(errors).length) return this.validationError(res, errors);
    return this.respond(res, next, () => AccountService.update(req.params.userId, dto.toObject()), { message: 'User updated successfully.' });
  }
  async remove(req, res, next) {
    return this.respond(res, next, async () => { await AccountService.remove(req.params.userId, req.user); return null; }, { message: 'User deleted successfully.' });
  }
  async updateRole(req, res, next) {
    const body = req.body || {};
    if (!USER_ROLES.includes(body.role) || Object.keys(body).some((key) => key !== 'role')) return this.validationError(res, { role: 'Provide a valid role only.' });
    return this.respond(res, next, () => AccountService.updateRole(req.params.userId, body.role, req.user), { message: 'User role updated successfully.' });
  }
  async updateStatus(req, res, next) {
    const body = req.body || {};
    if (!['active', 'inactive'].includes(body.status) || Object.keys(body).some((key) => key !== 'status')) return ResponseUtil.error(res, { status: 400, message: 'Status must be active or inactive.' });
    return this.respond(res, next, () => AccountService.updateStatus(req.params.userId, body.status), { message: body.status === 'inactive' ? 'Account locked successfully.' : 'Account unlocked successfully.' });
  }
}
module.exports = new AccountController();
