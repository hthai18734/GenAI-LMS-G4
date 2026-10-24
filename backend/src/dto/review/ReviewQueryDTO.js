const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { REVIEW_STATUSES } = require('../../domain/engagement/ReviewPolicy');
const PaginationUtil = require('../../utils/common/PaginationUtil');
const { text } = require('../common/DTOUtil');

class ReviewQueryDTO {
  constructor(query = {}) { this.query = query; }
  validate() {
    const errors = {};
    if (this.query.search !== undefined && (typeof this.query.search !== 'string' || text(this.query.search).length > 100)) errors.search = 'Search must not exceed 100 characters.';
    if (this.query.status && !REVIEW_STATUSES.includes(this.query.status)) errors.status = 'Invalid review status.';
    if (this.query.courseId && !isValidIdentifier(this.query.courseId)) errors.courseId = 'Course ID is invalid.';
    return errors;
  }
  toObject() {
    return { search: text(this.query.search), status: this.query.status || null, courseId: this.query.courseId || null, ...PaginationUtil.getPagination(this.query.page, this.query.limit) };
  }
}
module.exports = ReviewQueryDTO;
