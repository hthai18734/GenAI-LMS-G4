const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

assignmentSchema.index({ courseId: 1, createdAt: -1 });
assignmentSchema.index({ courseId: 1, lessonId: 1, createdAt: -1 });

module.exports = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
