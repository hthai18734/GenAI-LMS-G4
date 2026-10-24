const mongoose = require('mongoose');
const { ISSUE_TYPES, REPORT_STATUSES } = require('../../domain/learning/LearningContentReportPolicy');

const learningContentReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', default: null },
  issueType: { type: String, enum: ISSUE_TYPES, required: true },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: REPORT_STATUSES, default: 'OPEN', index: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  resolutionNote: { type: String, default: null, trim: true },
}, { timestamps: true, versionKey: false });

learningContentReportSchema.index({ courseId: 1, status: 1 });
learningContentReportSchema.index({ reporterId: 1, lessonId: 1, issueType: 1 });

const LearningContentReport = mongoose.models.LearningContentReport || mongoose.model('LearningContentReport', learningContentReportSchema);
LearningContentReport.ISSUE_TYPES = ISSUE_TYPES;
LearningContentReport.REPORT_STATUSES = REPORT_STATUSES;

module.exports = LearningContentReport;
