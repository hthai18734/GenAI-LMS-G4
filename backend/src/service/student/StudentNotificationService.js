const { NOTIFICATION_TYPES } = require('../../domain/learning/NotificationPolicy');
const ServiceError = require('../common/ServiceError');

class StudentNotificationService {
  constructor({ notificationPreferenceRepository, notificationRepository } = {}) {
    this.notificationPreferenceRepository = notificationPreferenceRepository;
    this.notificationRepository = notificationRepository;
  }

  async getNotificationPreferences(userId) {
    const preferences = await this.notificationPreferenceRepository.findByUserId(userId);
    const values = new Map((preferences || []).map((preference) => [preference.type, preference.enabled]));
    return {
      preferences: NOTIFICATION_TYPES.map((type) => ({
        type,
        enabled: values.has(type) ? Boolean(values.get(type)) : true,
      })),
      supportedTypes: NOTIFICATION_TYPES,
    };
  }

  async updateNotificationPreferences(userId, preferences) {
    const saved = await this.notificationPreferenceRepository.upsertMany(userId, preferences);
    return { preferences: saved.map((preference) => ({ type: preference.type, enabled: preference.enabled })) };
  }

  async listNotifications(userId, limit) {
    const notifications = await this.notificationRepository.findByRecipient(userId, {
      limit: Math.min(parseInt(limit, 10) || 20, 50),
    });
    return {
      notifications: notifications.map((notification) => ({
        id: String(notification._id),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      })),
    };
  }

  async sendTestNotification(userId, type = 'system') {
    if (!await this.notificationPreferenceRepository.isEnabled(userId, type)) {
      throw new ServiceError(400, 'This notification type is disabled in your settings. Enable it before sending a test!');
    }
    const samples = {
      course_update: ['New Lesson Update', 'New resources and videos are available for your course.', 'course'],
      email: ['Learning Email Digest', 'Weekly summary: You have reached your learning goals. Great work!', 'general'],
      enrollment: ['Enrollment Confirmation', 'Enrolled successfully! Enjoy your learning experience.', 'course'],
      system: ['System & Security Notification', 'AI-LMS is running normally and your sign-in session is secure.', 'system'],
    };
    const [title, message, notificationType] = samples[type] || samples.system;
    const created = await this.notificationRepository.create({ recipientId: userId, title, message, type: notificationType });
    return {
      notification: {
        id: String(created._id), title: created.title, message: created.message,
        type: created.type, createdAt: created.createdAt,
      },
    };
  }
}

module.exports = StudentNotificationService;
