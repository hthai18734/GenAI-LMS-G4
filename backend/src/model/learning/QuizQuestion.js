const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  order: { type: Number, default: 0 },
  addedAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });

quizQuestionSchema.index({ quizId: 1, questionId: 1 }, { unique: true });
quizQuestionSchema.index({ quizId: 1, order: 1 });

module.exports = mongoose.models.QuizQuestion || mongoose.model('QuizQuestion', quizQuestionSchema);
