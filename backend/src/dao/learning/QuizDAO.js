const mongoose = require('mongoose');
const Quiz = require('../../model/learning/Quiz');

class QuizDAO {
  async create(data) { return Quiz.create(data); }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Quiz.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return Quiz.find({ courseId, deletedAt: null }).sort({ createdAt: -1, _id: -1 }).exec();
  }

  async update(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Quiz.findOneAndUpdate({ _id: id, deletedAt: null }, updates, { new: true, runValidators: true }).exec();
  }

  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Quiz.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date() }, { new: true }).exec();
  }
}

module.exports = new QuizDAO();
