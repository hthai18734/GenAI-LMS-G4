const { USER_ROLES, USER_STATUSES } = require('../../domain/identity/UserPolicy');
const PaginationUtil = require('../../domain/common/PaginationPolicy');
const { text, isObjectPayload, strictInteger } = require('../common/DTOUtil');

class UserQueryDTO {
  constructor(query = {}) { this.payloadIsObject = isObjectPayload(query); this.query = this.payloadIsObject ? query : {}; }
  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
    if (this.query.search !== undefined && (typeof this.query.search !== 'string' || text(this.query.search).length > 100)) errors.search = 'Search must not exceed 100 characters.';
    if (this.query.role && !USER_ROLES.includes(this.query.role)) errors.role = 'Invalid user role.';
    if (this.query.status && !USER_STATUSES.includes(this.query.status)) errors.status = 'Invalid user status.';
    if (this.query.page !== undefined && strictInteger(this.query.page, { min: 1, max: 1000000 }) === null) errors.page = 'Invalid page.';
    if (this.query.limit !== undefined && strictInteger(this.query.limit, { min: 1, max: 100 }) === null) errors.limit = 'Invalid limit.';
    return errors;
  }
  toObject() {
    return { search: text(this.query.search), role: this.query.role || null, status: this.query.status || null, ...PaginationUtil.getPagination(this.query.page, this.query.limit) };
  }
}
module.exports = UserQueryDTO;
