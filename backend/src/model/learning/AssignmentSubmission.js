const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answer: { type: String, required: true, trim: true, maxlength: 10000 },
  status: { type: String, enum: ['submitted', 'passed', 'needs_revision'], default: 'submitted', index: true },
  feedback: { type: String, trim: true, default: '' },
  submittedAt: { type: Date, default: Date.now },
  gradedAt: { type: Date, default: null },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false });

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
module.exports = mongoose.models.AssignmentSubmission || mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
