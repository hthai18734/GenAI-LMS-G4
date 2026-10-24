import { api } from '../../shared/api/client.js';

export const publicService = {
  getHomepage: (limit = 6) => api(`/api/v1/public/home?limit=${limit}`),
  browseCourses: (page = 1, limit = 10) => api(`/api/v1/public/courses?page=${page}&limit=${limit}`),
  searchCourses: (q, page = 1, limit = 10) => api(`/api/v1/public/courses/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`),
  filterAndSortCourses: (params = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 'undefined' && value !== 'null')); return api(`/api/v1/public/courses/filter${query.size ? `?${query}` : ''}`); },
  getCourseDetail: (courseId) => api(`/api/v1/public/courses/${courseId}`),
  getCategories: () => api('/api/v1/public/categories'),
  getTeacherProfile: (teacherId) => api(`/api/v1/public/teachers/${teacherId}`),
};
