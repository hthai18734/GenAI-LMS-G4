/**
Author: ThienDDN - CE182101
Created at: 01/10/2026
Description: UC-10.4 Complete Lesson (Progress tracking)
 */
const { objectId } = require('../common/DTOUtil');

class CompleteLessonDTO {
  constructor({ userId = null, courseId = null, lessonId = null } = {}) {
    this.userId = userId;
    this.courseId = courseId;
    this.lessonId = lessonId;
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
    if (!this.lessonId) {
      errors.lessonId = 'Lesson ID is required.';
    } else if (!objectId(this.lessonId)) {
      errors.lessonId = 'Lesson ID is invalid.';
    }
    return errors;
  }

  toObject() {
    return {
      userId: this.userId,
      courseId: this.courseId,
      lessonId: this.lessonId,
    };
  }
}

module.exports = CompleteLessonDTO;
