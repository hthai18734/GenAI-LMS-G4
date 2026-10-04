const { text } = require('../common/DTOUtil');

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected'];

class TeacherApplicationQueryDTO {
  constructor(query = {}) {
    this.query = query;
    this.status = text(query.status);
  }

  validate() {
    const errors = {};
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
