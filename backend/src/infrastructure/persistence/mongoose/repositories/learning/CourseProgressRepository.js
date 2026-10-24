const mongoose = require('mongoose');
const CourseProgress = require('../../../../../model/learning/CourseProgress');

class CourseProgressRepository {
  async findByStudentAndCourse(studentId, courseId) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId)) return null;
    return CourseProgress.findOne({ studentId, courseId }).exec();
  }

  async upsertProgress(studentId, courseId, data) {
    return CourseProgress.findOneAndUpdate(
      { studentId, courseId },
      {
        $set: {
          percentage: data.percentage,
          completedRequired: data.completedRequired,
          totalRequired: data.totalRequired,
          eligibleToComplete: data.eligibleToComplete,
          byType: data.byType,
          remainingActivities: data.remainingActivities,
          lastCalculatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = new CourseProgressRepository();
