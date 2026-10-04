/**
Author: ThienDDN - CE182101
Created at: 01/10/2026
Description: UC-10.4 View Course Lessons
 */
const { objectId } = require('../common/DTOUtil');

class CourseLessonsQueryDTO {
  constructor({ params = {}, user = {} } = {}) {
    this.userId = user._id || null;
    this.courseId = params.courseId || null;
  }

  validate() {
    const errors = {};
    if (!this.userId) {
      errors.userId = 'User ID is required.';
    }
    if (!this.courseId) {
      errors.courseId = 'Course ID is required.';
    } else if (!objectId(this.courseId)) {
      errors.courseId = 'Course ID is invalid.';
    }
    return errors;
  }

  toObject() {
    return {
      userId: this.userId,
      courseId: this.courseId,
    };
  }
}

module.exports = CourseLessonsQueryDTO;
