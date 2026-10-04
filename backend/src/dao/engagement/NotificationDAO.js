const mongoose = require('mongoose');
const Notification = require('../../model/engagement/Notification');

class NotificationDAO {
  async create(data) {
    return Notification.create(data);
  }

  async findByRecipient(recipientId, { limit = 20 } = {}) {
    if (!mongoose.isValidObjectId(recipientId)) return [];
    return Notification.find({ recipientId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async markAsRead(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Notification.findByIdAndUpdate(id, { isRead: true }, { new: true }).exec();
  }

  async countUnread(recipientId) {
    if (!mongoose.isValidObjectId(recipientId)) return 0;
    return Notification.countDocuments({ recipientId, isRead: false }).exec();
  }

  async markAllAsRead(recipientId) {
    if (!mongoose.isValidObjectId(recipientId)) return null;
    return Notification.updateMany({ recipientId, isRead: false }, { isRead: true }).exec();
  }
}

module.exports = new NotificationDAO();
