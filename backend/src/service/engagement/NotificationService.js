const PaginationUtil = require('../../utils/common/PaginationUtil');
const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

class NotificationService {
  constructor({ notificationRepository } = {}) {
    this.notificationRepository = notificationRepository;
  }
  async list(userId, paging) {
    const query = PaginationUtil.getPagination(paging.page, paging.limit || 20);
    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationRepository.findByRecipient(userId, query), this.notificationRepository.count(userId), this.notificationRepository.countUnread(userId),
    ]);
    return {
      pagination: PaginationUtil.formatPaginatedResponse(notifications, total, query.page, query.limit).pagination,
      unreadCount,
      notifications: notifications.map((n) => ({ id: String(n._id), title: n.title, message: n.message, type: n.type, isRead: n.isRead, createdAt: n.createdAt })),
    };
  }
  async unreadCount(userId) { return { unreadCount: await this.notificationRepository.countUnread(userId) }; }
  assertId(id) { if (!isValidIdentifier(id)) throw new ServiceError(400, 'Invalid notification ID.'); }
  async markAsRead(notificationId, userId) {
    this.assertId(notificationId);
    if (!await this.notificationRepository.markAsRead(notificationId, userId)) throw new ServiceError(404, 'Notification not found.');
  }
  async markAllAsRead(userId) { return { modifiedCount: (await this.notificationRepository.markAllAsRead(userId)).modifiedCount }; }
  async remove(notificationId, userId) {
    this.assertId(notificationId);
    if (!await this.notificationRepository.remove(notificationId, userId)) throw new ServiceError(404, 'Notification not found.');
  }
}
module.exports = NotificationService;
