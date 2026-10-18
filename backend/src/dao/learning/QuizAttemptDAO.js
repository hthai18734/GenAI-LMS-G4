const mongoose = require('mongoose');
const QuizAttempt = require('../../model/learning/QuizAttempt');

class QuizAttemptDAO {
  async create(data) { return QuizAttempt.create(data); }

  async countByUserAndQuiz(userId, quizId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(quizId)) return 0;
    return QuizAttempt.countDocuments({ userId, quizId });
  }

  async findByIdForUser(id, userId) {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) return null;
    return QuizAttempt.findOne({ _id: id, userId }).exec();
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

module.exports = new QuizAttemptDAO();
