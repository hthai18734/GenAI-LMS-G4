const mongoose = require('mongoose');
const Material = require('../../../../../model/learning/Material');

class MaterialRepository {
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Material.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findActiveByLessonId(lessonId) {
    if (!mongoose.isValidObjectId(lessonId)) return [];
    return Material.find({ lessonId, deletedAt: null }).sort({ createdAt: 1 }).exec();
  }

  async findActiveByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return Material.find({ courseId, deletedAt: null }).sort({ createdAt: 1 }).exec();
  }

  async create(data) {
    return Material.create(data);
  }

  async update(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Material.findOneAndUpdate(
      { _id: id, deletedAt: null },
      updates,
      { new: true, runValidators: true }
    ).exec();
  }

  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Material.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    ).exec();
  }

  async softDeleteByLessonId(lessonId) {
    if (!mongoose.isValidObjectId(lessonId)) return 0;
    if (mongoose.connection.readyState !== 1) return 0;
    const res = await Material.updateMany(
      { lessonId, deletedAt: null },
      { deletedAt: new Date() }
    ).exec();
    return res.modifiedCount || 0;
  }

  async countByLessonId(lessonId) {
    if (!mongoose.isValidObjectId(lessonId)) return 0;
    return Material.countDocuments({ lessonId, deletedAt: null });
  }
}

module.exports = new MaterialRepository();
