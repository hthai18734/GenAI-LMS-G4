const { text } = require('../common/DTOUtil');

class TeacherProfileQueryDTO {
  constructor(params = {}) {
    this.params = params;
    this.teacherId = text(params.teacherId);
  }

  validate() {
    const errors = {};
    if (!this.teacherId) {
      errors.teacherId = 'Teacher ID is required.';
    }
    return errors;
  }

  toObject() {
    return {
      teacherId: this.teacherId,
    };
  }
}

module.exports = TeacherProfileQueryDTO;
