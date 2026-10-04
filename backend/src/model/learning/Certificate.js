const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  issuedAt: { type: Date, default: Date.now },
  certificateNumber: { type: String, unique: true, required: true },
}, { timestamps: true, versionKey: false });

certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);
