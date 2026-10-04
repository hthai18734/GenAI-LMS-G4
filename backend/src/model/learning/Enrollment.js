const mongoose = require('mongoose');

const ENROLLMENT_STATUSES = ['active', 'completed', 'dropped'];

const enrollmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'active', index: true },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

enrollmentSchema.index({ userId: 1, courseId: 1, status: 1 });

const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
Enrollment.ENROLLMENT_STATUSES = ENROLLMENT_STATUSES;

module.exports = Enrollment;
