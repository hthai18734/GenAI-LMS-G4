const mongoose = require('mongoose');
const Section = require('../../../../../model/learning/Section');
class SectionRepository {
  async findById(id) { return mongoose.isValidObjectId(id) ? Section.findOne({ _id: id, deletedAt: null }).exec() : null; }
  async findByCourseId(courseId) { return Section.find({ courseId, deletedAt: null }).sort({ order: 1, _id: 1 }).exec(); }
  async nextOrder(courseId) {
    const last = await Section.findOne({ courseId, deletedAt: null }).sort({ order: -1 }).lean();
    return (last?.order || 0) + 1;
  }
  async create(data) { return Section.create(data); }
  async ensureDefault(courseId) {
    const order = await this.nextOrder(courseId);
    try {
      return await Section.findOneAndUpdate({ courseId, isDefault: true },
        { $setOnInsert: { title: 'General', order, deletedAt: null } },
        { upsert: true, new: true, runValidators: true }).exec();
    } catch (error) {
      if (error.code !== 11000) throw error;
      return Section.findOne({ courseId, isDefault: true, deletedAt: null }).exec();
    }
  }
}
module.exports = new SectionRepository();
