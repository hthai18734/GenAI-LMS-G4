const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  percentage: { type: Number, default: 0, min: 0, max: 100 },
  completedRequired: { type: Number, default: 0 },
  totalRequired: { type: Number, default: 0 },
  eligibleToComplete: { type: Boolean, default: false, index: true },
  byType: {
    LESSON: { completed: { type: Number, default: 0 }, total: { type: Number, default: 0 }, ratio: { type: Number, default: 0 } },
    QUIZ: { completed: { type: Number, default: 0 }, total: { type: Number, default: 0 }, ratio: { type: Number, default: 0 } },
    ASSIGNMENT: { completed: { type: Number, default: 0 }, total: { type: Number, default: 0 }, ratio: { type: Number, default: 0 } },
  },
  remainingActivities: [{ type: String }],
  lastCalculatedAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });

courseProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const CourseProgress = mongoose.models.CourseProgress || mongoose.model('CourseProgress', courseProgressSchema);

module.exports = CourseProgress;
