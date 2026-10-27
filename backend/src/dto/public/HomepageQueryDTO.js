/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Homepage Query DTO for Guest Public Courses (UC-1.1)
 */
const { isObjectPayload, strictInteger } = require('../common/DTOUtil');

class HomepageQueryDTO {
  constructor(query = {}) {
    this.payloadIsObject = isObjectPayload(query);
    this.query = this.payloadIsObject ? query : {};
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
    if (this.query.limit !== undefined && this.query.limit !== '') {
      if (strictInteger(this.query.limit, { min: 1, max: 50 }) === null) {
        errors.limit = 'Limit must be an integer greater than zero.';
      }
    }
    return errors;
  }

  toObject() {
    return {
      limit: Math.min(Number(this.query.limit) || 6, 50),
    };
  }
}

module.exports = HomepageQueryDTO;
