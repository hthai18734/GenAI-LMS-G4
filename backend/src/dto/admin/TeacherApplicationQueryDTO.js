/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Teacher Application Query DTO (Admin View Applications)
 */
const { text, isObjectPayload } = require('../common/DTOUtil');

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected'];

class TeacherApplicationQueryDTO {
  constructor(query = {}) {
    this.payloadIsObject = isObjectPayload(query);
    this.query = this.payloadIsObject ? query : {};
    this.status = text(this.query.status);
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
    if (this.status && !ALLOWED_STATUSES.includes(this.status)) {
      errors.status = 'Status filter must be pending, approved, or rejected.';
    }
    return errors;
  }

  toObject() {
    return {
      status: this.status || undefined,
    };
  }
}

module.exports = TeacherApplicationQueryDTO;
