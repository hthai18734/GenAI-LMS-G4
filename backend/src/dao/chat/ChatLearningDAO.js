const Course = require('../../model/learning/Course');
const Enrollment = require('../../model/learning/Enrollment');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');

module.exports = {
  async catalog() {
    return Course.find({ deletedAt: null, status: COURSE_STATUS.PUBLIC })
      .select('_id title description category duration price').sort({ _id: 1 }).limit(300).lean();
  },
  async enrollments(userId) {
    return Enrollment.find({ userId, status: { $in: ['active', 'completed'] } })
      .select('courseId status').limit(300).lean();
  },
};
