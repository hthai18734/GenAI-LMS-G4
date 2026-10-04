const { objectId } = require('../common/DTOUtil');

class EnrollCourseDTO {
  constructor({ params = {}, body = {} } = {}) {
    this.courseId = params.courseId || body.courseId || null;
  }

  validate() {
    const errors = {};
    if (!this.courseId) {
      errors.courseId = 'Course ID is required.';
    } else if (!objectId(this.courseId)) {
      errors.courseId = 'Course ID is invalid.';
    }
    return errors;
  }

  toObject() {
    return { courseId: this.courseId };
  }
}

module.exports = EnrollCourseDTO;
