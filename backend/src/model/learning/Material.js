const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 255 },
  description: { type: String, trim: true, default: '' },
  storageKey: { type: String, required: true },
  filePath: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true, min: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

materialSchema.index({ lessonId: 1, deletedAt: 1 });
materialSchema.index({ courseId: 1, deletedAt: 1 });

module.exports = mongoose.models.Material || mongoose.model('Material', materialSchema);
