const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  timeLimit: { type: Number, required: true, min: 1 },
  passingScore: { type: Number, required: true, min: 0, max: 100 },
  attemptLimit: { type: Number, required: true, default: 1, min: 1 },
  isPublished: { type: Boolean, default: true, index: true },
  deadline: { type: Date, default: null, index: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

quizSchema.index({ courseId: 1, lessonId: 1, deletedAt: 1 });

module.exports = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
