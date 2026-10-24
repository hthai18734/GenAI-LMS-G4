const mongoose = require('mongoose');
const QuizQuestion = require('../../../../../model/learning/QuizQuestion');

class QuizQuestionRepository {
  async create(data) {
    return QuizQuestion.create(data);
  }

  async findByQuizId(quizId) {
    if (!mongoose.isValidObjectId(quizId)) return [];
    return QuizQuestion.find({ quizId }).sort({ order: 1, _id: 1 }).exec();
  }

  async findQuestionIdsByQuizId(quizId) {
    const mappings = await this.findByQuizId(quizId);
    return mappings.map((m) => m.questionId);
  }

  async findByQuizAndQuestion(quizId, questionId) {
    if (!mongoose.isValidObjectId(quizId) || !mongoose.isValidObjectId(questionId)) return null;
    return QuizQuestion.findOne({ quizId, questionId }).exec();
  }

  async linkQuestion(quizId, questionId, order = null) {
    if (!mongoose.isValidObjectId(quizId) || !mongoose.isValidObjectId(questionId)) return null;
    let targetOrder = order;
    if (targetOrder === null || targetOrder === undefined) {
      targetOrder = await this.getNextOrder(quizId);
    }
    return QuizQuestion.findOneAndUpdate(
      { quizId, questionId },
      { $setOnInsert: { order: targetOrder, addedAt: new Date() } },
      { upsert: true, new: true }
    ).exec();
  }

  async unlinkQuestion(quizId, questionId) {
    if (!mongoose.isValidObjectId(quizId) || !mongoose.isValidObjectId(questionId)) return null;
    return QuizQuestion.findOneAndDelete({ quizId, questionId }).exec();
  }

  async deleteByQuizId(quizId) {
    if (!mongoose.isValidObjectId(quizId)) return { deletedCount: 0 };
    return QuizQuestion.deleteMany({ quizId }).exec();
  }

  async getNextOrder(quizId) {
    if (!mongoose.isValidObjectId(quizId)) return 0;
    const last = await QuizQuestion.findOne({ quizId }).sort({ order: -1 }).select('order').exec();
    return last ? (last.order + 1) : 0;
  }

  async countActiveByQuestionId(questionId) {
    if (!mongoose.isValidObjectId(questionId)) return 0;
    const result = await QuizQuestion.aggregate([
      { $match: { questionId: new mongoose.Types.ObjectId(questionId) } },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz',
        },
      },
      { $unwind: '$quiz' },
      { $match: { 'quiz.deletedAt': null } },
      { $count: 'total' },
    ]);
    return result[0]?.total || 0;
  }
}

module.exports = new QuizQuestionRepository();
