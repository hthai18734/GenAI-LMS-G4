const mongoose = require('mongoose');

const ACTIVITY_TYPES = ['LESSON_ACTIVE', 'VIDEO_WATCH', 'QUIZ_SUBMIT', 'COURSE_COMPLETE'];

const learningActivityLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
  activityType: { type: String, enum: ACTIVITY_TYPES, required: true },
  startedAt: { type: Date, required: true, index: true },
  endedAt: { type: Date, required: true },
  activeSeconds: { type: Number, required: true, min: 0 },
  date: { type: String, required: true, index: true }, // Format YYYY-MM-DD
  eventKey: { type: String, default: null },
}, { timestamps: true, versionKey: false });

learningActivityLogSchema.index({ studentId: 1, startedAt: 1 });
learningActivityLogSchema.index({ studentId: 1, courseId: 1, startedAt: 1 });
learningActivityLogSchema.index(
  { eventKey: 1 },
  { unique: true, partialFilterExpression: { eventKey: { $type: 'string' } } }
);

const LearningActivityLog = mongoose.models.LearningActivityLog || mongoose.model('LearningActivityLog', learningActivityLogSchema);
LearningActivityLog.ACTIVITY_TYPES = ACTIVITY_TYPES;

module.exports = LearningActivityLog;
