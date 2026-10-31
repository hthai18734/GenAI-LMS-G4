import { api } from '../../../shared/api/client.js';

export const learningReportService = {
  reportIssue: data => api('/api/learning-content-reports', { method: 'POST', body: JSON.stringify(data) }),
  getMyReports: () => api('/api/me/learning-content-reports'),
  getTeacherReports: (query = '') => api(`/api/teacher/learning-content-reports${query ? `?${query}` : ''}`),
  getReportDetail: id => api(`/api/teacher/learning-content-reports/${id}`),
  resolveReport: (id, data) => api(`/api/teacher/learning-content-reports/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
};
