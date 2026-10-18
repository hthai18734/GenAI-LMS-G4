const mongoose = require('mongoose');
const Question = require('../../model/learning/Question');

class QuestionDAO {
  async create(data) { return Question.create(data); }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Question.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findByQuizId(quizId) {
    if (!mongoose.isValidObjectId(quizId)) return [];
    return Question.find({ quizId, deletedAt: null }).sort({ createdAt: 1, _id: 1 }).exec();
  }

  async update(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Question.findOneAndUpdate({ _id: id, deletedAt: null }, updates, { new: true, runValidators: true }).exec();
  }

  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Question.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date() }, { new: true }).exec();
  }
}

module.exports = new QuestionDAO();
