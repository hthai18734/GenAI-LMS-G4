/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Browse Courses Query DTO for Guest Public Courses (UC-1.2)
 */
const { isObjectPayload, strictInteger } = require('../common/DTOUtil');

class BrowseCoursesQueryDTO {
  constructor(query = {}) {
    this.payloadIsObject = isObjectPayload(query);
    this.query = this.payloadIsObject ? query : {};
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
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
      page: Math.max(1, Number(this.query.page) || 1),
      limit: Math.min(Number(this.query.limit) || 10, 100),
    };
  }
}

module.exports = BrowseCoursesQueryDTO;
