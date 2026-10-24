const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  questionText: { type: String, required: true, trim: true },
  options: [{ type: String, required: true, trim: true }],
  correctAnswer: { type: String, required: true, trim: true },
  explanation: { type: String, default: '', trim: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

questionSchema.index({ quizId: 1, deletedAt: 1 });

module.exports = mongoose.models.Question || mongoose.model('Question', questionSchema);
