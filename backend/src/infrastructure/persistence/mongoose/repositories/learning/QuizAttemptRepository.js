const mongoose = require('mongoose');
const QuizAttempt = require('../../../../../model/learning/QuizAttempt');

class QuizAttemptRepository {
  async create(data) { return QuizAttempt.create(data); }

  async countByUserAndQuiz(userId, quizId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(quizId)) return 0;
    return QuizAttempt.countDocuments({ userId, quizId });
  }

  async findByIdForUser(id, userId) {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) return null;
    return QuizAttempt.findOne({ _id: id, userId }).exec();
  }

  async findLatestSubmittedByUserAndQuizIds(userId, quizIds) {
    if (!mongoose.isValidObjectId(userId)) return [];
    const ids = quizIds.filter((id) => mongoose.isValidObjectId(id));
    if (!ids.length) return [];
    return QuizAttempt.find({ userId, quizId: { $in: ids }, status: 'submitted' })
      .sort({ submittedAt: -1, _id: -1 })
      .exec();
  }

  async findLatestCompleted(userId, quizId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(quizId)) return null;
    return QuizAttempt.findOne({ userId, quizId, status: 'submitted' })
      .sort({ submittedAt: -1, _id: -1 })
      .exec();
  }

  async submit(id, userId, updates, now = new Date()) {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) return null;
    return QuizAttempt.findOneAndUpdate(
      { _id: id, userId, status: 'in_progress', expiresAt: { $gt: now } },
      updates,
      { new: true, runValidators: true },
    ).exec();
  }
}

module.exports = new QuizAttemptRepository();
