const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, trim: true, default: '' },
    order: { type: Number, required: true, default: 0 },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

lessonSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.models.Lesson || mongoose.model('Lesson', lessonSchema);
