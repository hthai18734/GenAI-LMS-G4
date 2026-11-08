const mongoose = require('mongoose');
const LearningActivityLog = require('../../../../../model/learning/LearningActivityLog');

class LearningActivityLogRepository {
  async logActivity(data) {
    return LearningActivityLog.create(data);
  }

  async recordActivityOnce(eventKey, data) {
    return LearningActivityLog.findOneAndUpdate(
      { eventKey },
      { $setOnInsert: { ...data, eventKey } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  async findStudentIntervals(studentId, { from, to, courseId } = {}) {
    if (!mongoose.isValidObjectId(studentId)) return [];
    const filter = {
      studentId,
      startedAt: { $lte: new Date(to) },
      endedAt: { $gte: new Date(from) },
    };
    if (courseId && mongoose.isValidObjectId(courseId)) {
      filter.courseId = courseId;
    }

    return LearningActivityLog.find(filter)
      .sort({ startedAt: 1 })
      .lean()
      .exec();
  }

  async countActivities(studentId, { from, to, courseId, activityType } = {}) {
    if (!mongoose.isValidObjectId(studentId)) return 0;
    const filter = {
      studentId,
      startedAt: { $gte: new Date(from), $lte: new Date(to) },
    };
    if (courseId && mongoose.isValidObjectId(courseId)) filter.courseId = courseId;
    if (activityType) filter.activityType = activityType;

    return LearningActivityLog.countDocuments(filter);
  }
}

module.exports = new LearningActivityLogRepository();
