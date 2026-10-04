const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  purpose: { type: String, enum: ['email_verification'], required: true, default: 'email_verification', index: true },
  otpHash: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  wrongAttempts: { type: Number, default: 0 },
  resendAvailableAt: { type: Date, required: true },
  otpExpiresAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, versionKey: false });

otpVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.models.OtpVerification || mongoose.model('OtpVerification', otpVerificationSchema);
