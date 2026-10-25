/**
Author: ThienDDN - CE182101
Created at: 01/10/2026
Description: Student Course Enrollment
 */
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
