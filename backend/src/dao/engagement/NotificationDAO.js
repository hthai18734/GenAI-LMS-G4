const mongoose = require('mongoose');
const Notification = require('../../model/engagement/Notification');

class NotificationDAO {
  /**
   * Create new notification (UC-5.1, UC-5.2)
   */
  async create(data) {
    return Notification.create(data);
  }

  /**
   * Find notifications for a specific user
   */
  async findByRecipient(recipientId, { limit = 20 } = {}) {
    if (!mongoose.isValidObjectId(recipientId)) return [];
    return Notification.find({ recipientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Notification.findByIdAndUpdate(id, { isRead: true }, { new: true }).exec();
  }

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

module.exports = new NotificationDAO();
