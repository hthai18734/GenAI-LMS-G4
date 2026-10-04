const { objectId, text } = require('../common/DTOUtil');

class UpdateUserRoleDTO {
  constructor(params = {}, body = {}) {
    this.userId = objectId(params.userId);
    this.role = text(body.role);
  }

  validate() {
    const errors = {};
    if (!this.userId) errors.userId = 'A valid user ID is required.';
    if (!['student', 'teacher'].includes(this.role)) errors.role = 'Role must be student or teacher.';
    return errors;
  }

  toObject() { return { userId: this.userId, role: this.role }; }
}

module.exports = UpdateUserRoleDTO;
