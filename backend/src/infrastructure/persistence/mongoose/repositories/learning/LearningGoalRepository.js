const mongoose = require('mongoose');
const LearningGoal = require('../../../../../model/learning/LearningGoal');

class LearningGoalRepository {
  async create(data) {
    return LearningGoal.create(data);
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return LearningGoal.findById(id).exec();
  }

  async findOwned(studentId, id) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(id)) return null;
    return LearningGoal.findOne({ _id: id, studentId })
      .populate('courseId', 'title thumbnail category')
      .exec();
  }

  async findByStudent(studentId, { status, courseId, page = 1, limit = 20 } = {}) {
    if (!mongoose.isValidObjectId(studentId)) return { items: [], total: 0 };
    const filter = { studentId };
    if (status) filter.status = status;
    if (courseId && mongoose.isValidObjectId(courseId)) filter.courseId = courseId;

    const skip = (Math.max(1, page) - 1) * limit;
    const [items, total] = await Promise.all([
      LearningGoal.find(filter)
        .populate('courseId', 'title thumbnail category')
        .sort({ deadline: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      LearningGoal.countDocuments(filter),
    ]);

    return { items, total };
  }

  async updateRule(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return LearningGoal.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('courseId', 'title thumbnail category').exec();
  }

  async markCancelled(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return LearningGoal.findByIdAndUpdate(
      id,
      { status: 'CANCELLED', cancelledAt: new Date() },
      { new: true }
    ).populate('courseId', 'title thumbnail category').exec();
  }

  async markCompleted(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return LearningGoal.findByIdAndUpdate(
      id,
      { status: 'COMPLETED', completedAt: new Date() },
      { new: true }
    ).populate('courseId', 'title thumbnail category').exec();
  }

  async deleteById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return LearningGoal.findByIdAndDelete(id).exec();
  }

  async findInProgressByCourse(studentId, courseId) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId)) return [];
    return LearningGoal.find({ studentId, courseId, status: 'IN_PROGRESS' }).exec();
  }

  async updateProgress(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return LearningGoal.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).exec();
  }
}

module.exports = new LearningGoalRepository();
