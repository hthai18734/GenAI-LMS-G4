const mongoose = require('mongoose');
const Progress = require('../../../../../model/learning/Progress');

class ProgressRepository {
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

  async countByUserAndCourse(userId, courseId, { publishedOnly = false } = {}) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return 0;
    if (!publishedOnly) return Progress.countDocuments({ userId, courseId, status: 'completed' });
    const [result] = await Progress.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), courseId: new mongoose.Types.ObjectId(courseId), status: 'completed' } },
      { $lookup: { from: 'lessons', localField: 'lessonId', foreignField: '_id', as: 'lesson' } },
      { $unwind: '$lesson' },
      { $match: { 'lesson.isPublished': true, 'lesson.deletedAt': null } },
      { $count: 'total' },
    ]);
    return result?.total || 0;
  }

  async findLastAccessedLesson(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    return Progress.findOne({ userId, courseId })
      .populate('lessonId')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async upsertProgress(userId, courseId, lessonId, status = 'completed', options = {}) {
    const update = {
      status,
      completedAt: status === 'completed' ? new Date() : null,
    };
    if (options.source) update.source = options.source;
    if (options.lastPositionSec !== undefined) update.lastPositionSec = options.lastPositionSec;
    return Progress.findOneAndUpdate(
      { userId, courseId, lessonId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = new ProgressRepository();
