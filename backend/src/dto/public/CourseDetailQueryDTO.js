/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Course Detail Query DTO for Guest Public Courses (UC-1.5)
 */
const { text } = require('../common/DTOUtil');

class CourseDetailQueryDTO {
  constructor(params = {}) {
    this.params = params;
    this.courseId = text(params.id || params.courseId);
  }

  validate() {
    const errors = {};
    if (!this.courseId) {
      errors.courseId = 'Course ID is required.';
    }
    return errors;
  }

  toObject() {
    return {
      courseId: this.courseId,
    };
  }
}

module.exports = CourseDetailQueryDTO;
