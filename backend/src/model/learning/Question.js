const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  // quizId records the origin of legacy questions; QuizQuestion owns quiz membership.
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null, index: true },
  ownerTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  questionText: { type: String, required: true, trim: true },
  options: [{ type: String, required: true, trim: true }],
  correctAnswer: { type: String, required: true, trim: true },
  explanation: { type: String, default: '', trim: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

questionSchema.index({ quizId: 1, deletedAt: 1 });
questionSchema.index({ ownerTeacherId: 1, categoryId: 1, deletedAt: 1 });

module.exports = mongoose.models.Question || mongoose.model('Question', questionSchema);
