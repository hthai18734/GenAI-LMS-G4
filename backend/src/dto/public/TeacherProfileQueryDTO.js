/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Teacher Profile Query DTO for Public Teacher View (UC-1.6)
 */
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
