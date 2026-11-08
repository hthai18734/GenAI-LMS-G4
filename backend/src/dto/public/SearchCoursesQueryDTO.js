/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Search Courses Query DTO for Guest Public Courses (UC-1.3)
 */
const { text, isObjectPayload, strictInteger } = require('../common/DTOUtil');

class SearchCoursesQueryDTO {
  constructor(query = {}) {
    this.payloadIsObject = isObjectPayload(query);
    this.query = this.payloadIsObject ? query : {};
    this.keyword = text(this.query.q !== undefined ? this.query.q : this.query.keyword);
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
    if (!this.keyword || this.keyword.length === 0) {
      errors.keyword = 'Keyword required';
    } else if (this.keyword.length < 2) {
      errors.keyword = 'Keyword must be at least 2 characters long';
    } else if (this.keyword.length > 100) {
      errors.keyword = 'Keyword must not exceed 100 characters';
    }

    if (this.query.page !== undefined && this.query.page !== '') {
      if (strictInteger(this.query.page, { min: 1, max: 1000000 }) === null) {
        errors.page = 'Page must be an integer greater than zero.';
      }
    }

    if (this.query.limit !== undefined && this.query.limit !== '') {
      if (strictInteger(this.query.limit, { min: 1, max: 100 }) === null) {
        errors.limit = 'Limit must be an integer greater than zero.';
      }
    }

    return errors;
  }

  toObject() {
    return {
      keyword: this.keyword,
      page: Math.max(1, Number(this.query.page) || 1),
      limit: Math.min(Number(this.query.limit) || 10, 100),
    };
  }
}

module.exports = SearchCoursesQueryDTO;
