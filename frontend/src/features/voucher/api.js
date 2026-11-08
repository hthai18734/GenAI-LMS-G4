import { api } from '../../shared/api/client.js';

export const voucherService = {
  history: (id, page = 1) => api(`/api/admin/vouchers/${id}/redemptions?page=${page}`),
  toggle: (id, newStatus) => api(`/api/admin/vouchers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ newStatus }) }),
  available: () => api('/api/student/vouchers/available'),
  list: (query = {}) => api(`/api/admin/vouchers?${new URLSearchParams(query)}`),
  detail: (id) => api(`/api/admin/vouchers/${id}`),
  create: (body) => api('/api/admin/vouchers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/api/admin/vouchers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/api/admin/vouchers/${id}`, { method: 'DELETE' }),
  apply: (courseId, code) => api('/api/student/vouchers/apply', { method: 'POST', body: JSON.stringify({ courseId, code }) }),
};
