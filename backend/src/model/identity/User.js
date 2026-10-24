const mongoose = require('mongoose');
const { USER_ROLES, USER_STATUSES, TEACHING_STATUSES } = require('../../domain/identity/UserPolicy');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: null },
  passwordHash: { type: String, required: false, select: false, default: null },
  role: { type: String, enum: USER_ROLES, default: 'student', index: true },
  avatar: { type: String, trim: true, default: null },
  status: { type: String, enum: USER_STATUSES, default: 'active', index: true },
  teachingStatus: { type: String, enum: TEACHING_STATUSES, default: 'active', index: true },
  emailVerifiedAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  tokenVersion: { type: Number, default: 0 },
  passwordResetHash: { type: String, select: false, default: null },
  passwordResetExpiresAt: { type: Date, select: false, default: null },
  passwordResetRequestedAt: { type: Date, select: false, default: null },
}, { timestamps: true, versionKey: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);
User.USER_ROLES = USER_ROLES;
User.USER_STATUSES = USER_STATUSES;

module.exports = User;
