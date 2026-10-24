const mongoose = require('mongoose');
const Question = require('../../../../../model/learning/Question');

class QuestionRepository {
  async create(data) {
    return Question.create(data);
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Question.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findByIds(ids) {
    const validIds = (ids || []).filter((id) => mongoose.isValidObjectId(id));
    if (!validIds.length) return [];
    const questions = await Question.find({ _id: { $in: validIds }, deletedAt: null }).exec();
    const map = new Map(questions.map((q) => [String(q._id), q]));
    // Return ordered according to requested ids
    return validIds.map((id) => map.get(String(id))).filter(Boolean);
  }

  async findByQuizId(quizId) {
    if (!mongoose.isValidObjectId(quizId)) return [];
    return Question.find({ quizId, deletedAt: null }).sort({ createdAt: 1, _id: 1 }).exec();
  }

  async findByOwner(teacherId, { categoryId = null, keyword = '', page = 1, limit = 50 } = {}) {
    if (!mongoose.isValidObjectId(teacherId)) return { items: [], total: 0 };
    const filter = { ownerTeacherId: teacherId, deletedAt: null };
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      filter.categoryId = categoryId;
    }
    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      filter.questionText = { $regex: keyword.trim(), $options: 'i' };
    }

    const total = await Question.countDocuments(filter);
    const skip = (Math.max(1, page) - 1) * limit;
    const items = await Question.find(filter)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { items, total, page: Number(page), limit: Number(limit) };
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

module.exports = new QuestionRepository();
