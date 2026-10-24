const mongoose = require('mongoose');
const Progress = require('../../model/learning/Progress');

class ProgressDAO {
  async findByUserId(userId) {
    if (!mongoose.isValidObjectId(userId)) return [];
    return Progress.find({ userId })
      .populate('courseId')
      .populate('lessonId')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findByUserAndCourse(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return [];
    return Progress.find({ userId, courseId })
      .populate('lessonId')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async countByUserAndCourse(userId, courseId) {
    return Progress.countDocuments({ userId, courseId, status: 'completed' });
  }

  async findLastAccessedLesson(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    return Progress.findOne({ userId, courseId })
      .populate('lessonId')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async upsertProgress(userId, courseId, lessonId, status = 'completed') {
    return Progress.findOneAndUpdate(
      { userId, courseId, lessonId },
      { status, completedAt: status === 'completed' ? new Date() : null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = new ProgressDAO();
