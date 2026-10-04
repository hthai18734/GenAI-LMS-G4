const mongoose = require('mongoose');

const USER_ROLES = ['student', 'teacher', 'admin'];
const USER_STATUSES = ['pending', 'active', 'inactive'];

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: null },
  passwordHash: { type: String, required: false, select: false, default: null },
  role: { type: String, enum: USER_ROLES, default: 'student', index: true },
  avatar: { type: String, trim: true, default: null },
  status: { type: String, enum: USER_STATUSES, default: 'active', index: true },
  emailVerifiedAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);
User.USER_ROLES = USER_ROLES;
User.USER_STATUSES = USER_STATUSES;

module.exports = User;
