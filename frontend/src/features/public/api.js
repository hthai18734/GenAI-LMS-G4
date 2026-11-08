import { api } from '../../shared/api/client.js';

export const publicService = {
  getHomepage: (limit = 6, options = {}) => api(`/api/v1/public/home?limit=${limit}`, options),
  browseCourses: (page = 1, limit = 10, options = {}) => api(`/api/v1/public/courses?page=${page}&limit=${limit}`, options),
  searchCourses: (q, page = 1, limit = 10, options = {}) => api(`/api/v1/public/courses/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`, options),
  filterAndSortCourses: (params = {}, options = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 'undefined' && value !== 'null')); return api(`/api/v1/public/courses/filter${query.size ? `?${query}` : ''}`, options); },
  getCourseDetail: (courseId, options = {}) => api(`/api/v1/public/courses/${courseId}`, options),
  getCategories: (options = {}) => api('/api/v1/public/categories', options),
  getTeacherProfile: (teacherId, options = {}) => api(`/api/v1/public/teachers/${teacherId}`, options),
};
