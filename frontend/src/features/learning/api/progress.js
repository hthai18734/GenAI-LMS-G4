import { api } from '../../../shared/api/client.js';

export const progressService = {
  getCourseProgress: id => api(`/api/courses/${id}/progress`),
  markLessonComplete: id => api(`/api/lessons/${id}/completion`, { method: 'PUT' }),
  sendVideoHeartbeat: (id, data) => api(`/api/videos/${id}/progress/heartbeat`, { method: 'POST', body: JSON.stringify(data) }),
  getVideoProgress: id => api(`/api/videos/${id}/progress`),
};
