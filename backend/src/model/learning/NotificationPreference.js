const mongoose = require('mongoose');

const NOTIFICATION_TYPES = ['email', 'course_update', 'enrollment', 'promotion', 'system'];

const notificationPreferenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  enabled: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

notificationPreferenceSchema.index({ userId: 1, type: 1 }, { unique: true });

const NotificationPreference = mongoose.models.NotificationPreference
  || mongoose.model('NotificationPreference', notificationPreferenceSchema);
NotificationPreference.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

module.exports = NotificationPreference;
