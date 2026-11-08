import { api } from '../../shared/api/client.js';

export const notificationService = {
  getNotifications: (limit = 20, page = 1) => api(`/api/notifications?limit=${limit}&page=${page}`),
  deleteNotification: (id) => api(`/api/notifications/${id}`, { method: 'DELETE' }),
  getUnreadCount: () => api('/api/notifications/unread-count'),
  markNotificationRead: (id) => api(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => api('/api/notifications/read-all', { method: 'PUT' }),
  sendTestNotification: (type) => api('/api/student/notifications/test', { method: 'POST', body: JSON.stringify({ type }) }),
};
export const reviewService = {
  deleteReview: (scope, id) => api(`/api/${scope}/reviews/${id}`, { method: 'DELETE' }),
  getReviews: (scope, query = {}, courseId) => api(scope === 'public' ? `/api/public/courses/${courseId}/reviews?${new URLSearchParams(query)}` : `/api/${scope}/reviews?${new URLSearchParams(query)}`),
  getReview: (scope, id) => api(`/api/${scope}/reviews/${id}`),
  createReview: (courseId, data) => api(`/api/student/courses/${courseId}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  updateReview: (id, data) => api(`/api/student/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  moderateReview: (id, status) => api(`/api/admin/reviews/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  replyToReview: (id, data) => api(`/api/teacher/reviews/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),
};
