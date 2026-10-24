const mongoose = require('mongoose');
const { GOAL_TYPES, GOAL_STATUSES } = require('../../domain/learning/LearningGoalPolicy');

const learningGoalSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  goalType: { type: String, enum: GOAL_TYPES, required: true },
  targetValue: { type: Number, required: true, min: 1 },
  currentValue: { type: Number, default: 0, min: 0 },
  deadline: { type: Date, required: true, index: true },
  status: { type: String, enum: GOAL_STATUSES, default: 'IN_PROGRESS', index: true },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

learningGoalSchema.index({ studentId: 1, status: 1, deadline: 1 });

const LearningGoal = mongoose.models.LearningGoal || mongoose.model('LearningGoal', learningGoalSchema);
LearningGoal.GOAL_TYPES = GOAL_TYPES;
LearningGoal.GOAL_STATUSES = GOAL_STATUSES;

module.exports = LearningGoal;
