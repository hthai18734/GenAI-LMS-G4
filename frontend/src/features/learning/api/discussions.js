import { api } from '../../../shared/api/client.js';

export const discussionService = {
  getThreads: (courseId, page = 1, limit = 15) => api(`/api/courses/${courseId}/discussions?page=${page}&limit=${limit}`),
  createThread: (courseId, data) => api(`/api/courses/${courseId}/discussions`, { method: 'POST', body: JSON.stringify(data) }),
  getThreadDetail: id => api(`/api/discussions/${id}`),
  replyThread: (id, data) => api(`/api/discussions/${id}/replies`, { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id, data) => api(`/api/discussions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePost: id => api(`/api/discussions/${id}`, { method: 'DELETE' }),
};
