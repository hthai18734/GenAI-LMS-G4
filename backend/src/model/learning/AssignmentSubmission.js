const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answer: { type: String, default: '', trim: true, maxlength: 10000 },
  attachment: { type: require('./AssignmentFileSchema'), default: null },
  status: { type: String, enum: ['submitted', 'graded', 'passed', 'needs_revision'], default: 'submitted', index: true },
  score: { type: Number, default: null, min: 0 },
  maxScore: { type: Number, default: null },
  revision: { type: Number, default: 0 },
  feedbackAt: { type: Date, default: null },
  feedbackBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  feedback: { type: String, trim: true, default: '' },
  submittedAt: { type: Date, default: Date.now },
  gradedAt: { type: Date, default: null },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false });

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
module.exports = mongoose.models.AssignmentSubmission || mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
