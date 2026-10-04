const API_BASE = '';
const ACCESS_KEY = 'ai_lms_access_token';
const USER_KEY = 'ai_lms_user';
export const getToken = () => localStorage.getItem(ACCESS_KEY);
export function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }
export function saveSession(data) { if (data.accessToken) localStorage.setItem(ACCESS_KEY, data.accessToken); if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user)); }
export function clearSession() { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(USER_KEY); }
export async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getToken(); if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) { clearSession(); if (!['/login', '/register', '/verify-otp'].includes(window.location.pathname)) window.location.replace('/login'); throw new Error(body.message || 'Session expired.'); }
  if (!res.ok) { const error = new Error(body.message || 'Request failed.'); error.errors = body.errors || null; error.status = res.status; throw error; }
  return body;
}
export const notificationService = {
  getNotifications: (limit = 20) => api(`/api/notifications?limit=${limit}`),
  getUnreadCount: () => api('/api/notifications/unread-count'),
  markNotificationRead: (id) => api(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => api('/api/notifications/read-all', { method: 'PUT' }),
  sendTestNotification: (type) => api('/api/student/notifications/test', { method: 'POST', body: JSON.stringify({ type }) }),
};
export const studentService = {
  getProfile: () => api('/api/student/profile'), updateProfile: (data) => api('/api/student/profile', { method: 'PUT', body: JSON.stringify(data) }), getDashboard: () => api('/api/student/dashboard'), getLearningHistory: () => api('/api/student/learning-history'), getCertificates: () => api('/api/student/certificates'), getNotificationPreferences: () => api('/api/student/notifications/preferences'), updateNotificationPreferences: (preferences) => api('/api/student/notifications/preferences', { method: 'PUT', body: JSON.stringify({ preferences }) }), enrollCourse: (courseId) => api(`/api/student/courses/${courseId}/enroll`, { method: 'POST' }), getEnrolledCourses: () => api('/api/student/courses'), getCatalog: () => api('/api/student/courses/catalog'), startResumeCourse: (courseId) => api(`/api/student/courses/${courseId}/resume`), getCourseLessons: (courseId) => api(`/api/student/courses/${courseId}/lessons`), completeLesson: (courseId, lessonId) => api(`/api/student/courses/${courseId}/lessons/${lessonId}/complete`, { method: 'POST' }),
  getNotifications: (limit = 20) => notificationService.getNotifications(limit),
  getUnreadCount: () => notificationService.getUnreadCount(),
  markNotificationRead: (id) => notificationService.markNotificationRead(id),
  markAllNotificationsRead: () => notificationService.markAllNotificationsRead(),
  sendTestNotification: (type) => notificationService.sendTestNotification(type),
};
export const teacherService = {
  getDashboard: () => api('/api/teacher/dashboard'),
  getCourses: (query = '') => api(`/api/teacher/courses${query ? `?${query}` : ''}`), getCourse: (courseId) => api(`/api/teacher/courses/${courseId}`), createCourse: (data) => api('/api/teacher/courses', { method: 'POST', body: JSON.stringify(data) }), updateCourse: (courseId, data) => api(`/api/teacher/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(data) }), deleteCourse: (courseId) => api(`/api/teacher/courses/${courseId}`, { method: 'DELETE' }), submitForReview: (courseId) => api(`/api/teacher/courses/${courseId}/submit-review`, { method: 'POST' }), publish: (courseId) => api(`/api/teacher/courses/${courseId}/publish`, { method: 'POST' }), unpublish: (courseId) => api(`/api/teacher/courses/${courseId}/unpublish`, { method: 'POST' }), archive: (courseId) => api(`/api/teacher/courses/${courseId}/archive`, { method: 'POST' }), restore: (courseId) => api(`/api/teacher/courses/${courseId}/restore`, { method: 'POST' }), getLessons: (courseId) => api(`/api/teacher/courses/${courseId}/lessons`), createLesson: (courseId, data) => api(`/api/teacher/courses/${courseId}/lessons`, { method: 'POST', body: JSON.stringify(data) }), updateLesson: (courseId, lessonId, data) => api(`/api/teacher/courses/${courseId}/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(data) }), deleteLesson: (courseId, lessonId) => api(`/api/teacher/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' }), uploadThumbnail: (file) => { const data = new FormData(); data.append('thumbnail', file); return api('/api/teacher/uploads/course-thumbnail', { method: 'POST', body: data }); }, getCategories: () => api('/api/teacher/categories'),
};
export const authService = { login: (email, password) => api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }), register: (data) => api('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }), verifyOtp: (data) => api('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }), resendOtp: (data) => api('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }), getGoogleUrl: () => api(`/api/auth/google?origin=${encodeURIComponent(window.location.origin)}`), exchangeGoogleCode: (code) => api('/api/auth/google/exchange', { method: 'POST', body: JSON.stringify({ code }) }), logout: () => api('/api/auth/logout', { method: 'POST', body: '{}' }) };
export const publicService = { getHomepage: (limit = 6) => api(`/api/v1/public/home?limit=${limit}`), browseCourses: (page = 1, limit = 10) => api(`/api/v1/public/courses?page=${page}&limit=${limit}`), searchCourses: (q, page = 1, limit = 10) => api(`/api/v1/public/courses/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`), filterAndSortCourses: (params = {}) => { const sp = new URLSearchParams(); for (const [k, v] of Object.entries(params)) { if (v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null') sp.append(k, v); } const qs = sp.toString(); return api(`/api/v1/public/courses/filter${qs ? `?${qs}` : ''}`); }, getCourseDetail: (courseId) => api(`/api/v1/public/courses/${courseId}`), getCategories: () => api('/api/v1/public/categories'), getTeacherProfile: (teacherId) => api(`/api/v1/public/teachers/${teacherId}`) };
export const adminService = {
  getDashboard: () => api('/api/admin/dashboard'),
  getUsers: (params = {}) => api(`/api/admin/users?${new URLSearchParams(params)}`),
  createUser: (data) => api('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUserRole: (id, role) => api(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  getModerationCourses: (query = '') => api(`/api/admin/courses/moderation${query ? `?${query}` : ''}`), getModerationCourse: (courseId) => api(`/api/admin/courses/moderation/${courseId}`), approveCourse: (courseId) => api(`/api/admin/courses/${courseId}/approve`, { method: 'POST' }), rejectCourse: (courseId, reason) => api(`/api/admin/courses/${courseId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }), getCategories: () => api('/api/admin/categories'), createCategory: (data) => api('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) }), updateCategory: (id, data) => api(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }), deleteCategory: (id) => api(`/api/admin/categories/${id}`, { method: 'DELETE' }),
};
