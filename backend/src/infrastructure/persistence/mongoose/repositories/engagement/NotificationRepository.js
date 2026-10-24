const mongoose = require('mongoose');
const Notification = require('../../../../../model/engagement/Notification');

class NotificationRepository {
  /**
   * Create new notification (UC-5.1, UC-5.2)
   */
  async create(data) {
    return Notification.create(data);
  }

  /**
   * Find notifications for a specific user
   */
  async findByRecipient(recipientId, { limit = 20, skip = 0 } = {}) {
    if (!mongoose.isValidObjectId(recipientId)) return [];
    return Notification.find({ recipientId })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id, recipientId) {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(recipientId)) return null;
    return Notification.findOneAndUpdate({ _id: id, recipientId }, { $set: { isRead: true } }, { new: true }).exec();
  }
  async remove(id, recipientId) {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(recipientId)) return null;
    return Notification.findOneAndDelete({ _id: id, recipientId }).exec();
  }
  async count(recipientId) { return Notification.countDocuments({ recipientId }).exec(); }

  /**
   * Count unread notifications
   */
  async countUnread(recipientId) {
    if (!mongoose.isValidObjectId(recipientId)) return 0;
    return Notification.countDocuments({ recipientId, isRead: false }).exec();
  }

  /**
   * Mark all notifications as read for recipient
   */
  async markAllAsRead(recipientId) {
    if (!mongoose.isValidObjectId(recipientId)) return null;
    return Notification.updateMany({ recipientId, isRead: false }, { isRead: true }).exec();
  }
}

module.exports = new NotificationRepository();
