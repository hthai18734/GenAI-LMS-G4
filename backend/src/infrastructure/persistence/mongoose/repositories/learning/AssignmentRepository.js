const mongoose = require('mongoose');
const Assignment = require('../../../../../model/learning/Assignment');

class AssignmentRepository {
  async create(data) { return Assignment.create(data); }
  async findByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return Assignment.find({ courseId, deletedAt: null }).sort({ createdAt: -1, _id: -1 }).exec();
  }
  async findById(id) { return mongoose.isValidObjectId(id) ? Assignment.findOne({ _id: id, deletedAt: null }).exec() : null; }
  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Assignment.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: data },
      { new: true, runValidators: true }
    ).exec();
  }
  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Assignment.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: { deletedAt: new Date() } }, { new: true }).exec();
  }
}

module.exports = new AssignmentRepository();
