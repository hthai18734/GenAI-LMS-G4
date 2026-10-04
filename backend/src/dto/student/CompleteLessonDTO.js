const { objectId } = require('../common/DTOUtil');

class CompleteLessonDTO {
  constructor({ params = {}, user = {} } = {}) {
    this.userId = user._id || null;
    this.courseId = params.courseId || null;
    this.lessonId = params.lessonId || null;
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
