const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { REVIEW_STATUSES } = require('../../domain/engagement/ReviewPolicy');
const PaginationUtil = require('../../domain/common/PaginationPolicy');
const { text, isObjectPayload, strictInteger } = require('../common/DTOUtil');

class ReviewQueryDTO {
  constructor(query = {}) { this.payloadIsObject = isObjectPayload(query); this.query = this.payloadIsObject ? query : {}; }
  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
    if (this.query.search !== undefined && (typeof this.query.search !== 'string' || text(this.query.search).length > 100)) errors.search = 'Search must not exceed 100 characters.';
    if (this.query.status && !REVIEW_STATUSES.includes(this.query.status)) errors.status = 'Invalid review status.';
    if (this.query.courseId && !isValidIdentifier(this.query.courseId)) errors.courseId = 'Course ID is invalid.';
    if (this.query.page !== undefined && strictInteger(this.query.page, { min: 1, max: 1000000 }) === null) errors.page = 'Invalid page.';
    if (this.query.limit !== undefined && strictInteger(this.query.limit, { min: 1, max: 100 }) === null) errors.limit = 'Invalid limit.';
    return errors;
  }
  toObject() {
    return { search: text(this.query.search), status: this.query.status || null, courseId: this.query.courseId || null, ...PaginationUtil.getPagination(this.query.page, this.query.limit) };
  }
}
module.exports = ReviewQueryDTO;
