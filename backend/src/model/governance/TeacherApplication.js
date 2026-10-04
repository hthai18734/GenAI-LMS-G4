const mongoose = require('mongoose');

const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'];

const teacherApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bio: { type: String, trim: true, default: '' },
  cvUrl: { type: String, trim: true, default: null },
  certificates: { type: [String], default: [] },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectReason: { type: String, trim: true, default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

const TeacherApplication = mongoose.models.TeacherApplication || mongoose.model('TeacherApplication', teacherApplicationSchema);
TeacherApplication.APPLICATION_STATUSES = APPLICATION_STATUSES;

module.exports = TeacherApplication;
