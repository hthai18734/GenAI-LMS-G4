/**
Author: ThienDDN - CE182101
Created at: 01/10/2026
Description: Student Course Enrollment
 */
const { objectId } = require('../common/DTOUtil');

class EnrollCourseDTO {
  constructor({ courseId = null } = {}) {
    this.courseId = courseId;
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
