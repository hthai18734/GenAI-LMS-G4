import { api } from '../../../shared/api/client.js';

export const enrollmentService = {
  cancelEnrollment: id => api(`/api/enrollments/${id}/cancel`, { method: 'POST' }),
  completeCourse: id => api(`/api/enrollments/${id}/complete`, { method: 'POST' }),
};
