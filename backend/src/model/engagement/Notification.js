const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'teacher approval',
  'teacher rejection',
  'general',
  'system',
  'course',
  'deadline',
  'grade',
];

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'general', index: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false },
);

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
Notification.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

module.exports = Notification;
