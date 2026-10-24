const { USER_ROLES, USER_STATUSES } = require('../../domain/identity/UserPolicy');
const PaginationUtil = require('../../utils/common/PaginationUtil');
const { text } = require('../common/DTOUtil');

class UserQueryDTO {
  constructor(query = {}) { this.query = query; }
  validate() {
    const errors = {};
    if (this.query.search !== undefined && (typeof this.query.search !== 'string' || text(this.query.search).length > 100)) errors.search = 'Search must not exceed 100 characters.';
    if (this.query.role && !USER_ROLES.includes(this.query.role)) errors.role = 'Invalid user role.';
    if (this.query.status && !USER_STATUSES.includes(this.query.status)) errors.status = 'Invalid user status.';
    return errors;
  }
  toObject() {
    return { search: text(this.query.search), role: this.query.role || null, status: this.query.status || null, ...PaginationUtil.getPagination(this.query.page, this.query.limit) };
  }
}
module.exports = UserQueryDTO;
