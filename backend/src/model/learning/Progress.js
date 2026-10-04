const mongoose = require('mongoose');

const PROGRESS_STATUSES = ['in_progress', 'completed'];

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  status: { type: String, enum: PROGRESS_STATUSES, default: 'in_progress' },
  completedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

progressSchema.index({ userId: 1, courseId: 1, lessonId: 1 }, { unique: true });

const Progress = mongoose.models.Progress || mongoose.model('Progress', progressSchema);
Progress.PROGRESS_STATUSES = PROGRESS_STATUSES;

module.exports = Progress;
