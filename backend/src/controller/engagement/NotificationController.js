/**
Author: ThienDDN - CE182101
Created at: 02/10/2026
Description: Notification Inbox Controller for all authenticated users
 */
const mongoose = require('mongoose');
const NotificationDAO = require('../../dao/engagement/NotificationDAO');
const ResponseUtil = require('../../utils/common/ResponseUtil');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const userId = req.user._id;
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
      const notifications = await NotificationDAO.findByRecipient(userId, { limit });
      return ResponseUtil.success(res, {
        data: {
          notifications: notifications.map((n) => ({
            id: String(n._id),
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.isRead,
            createdAt: n.createdAt,
          })),
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user._id;
      const count = await NotificationDAO.countUnread(userId);
      return ResponseUtil.success(res, { data: { unreadCount: count } });
    } catch (error) {
      return next(error);
    }
  }

}

module.exports = new NotificationController();
