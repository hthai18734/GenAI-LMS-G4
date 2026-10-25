import { api } from '../../shared/api/client.js';

export const studentService = {
  getProfile: () => api('/api/student/profile'),
  updateProfile: (data) => api('/api/student/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getDashboard: () => api('/api/student/dashboard'),
  getLearningHistory: () => api('/api/student/learning-history'),
  getCertificates: () => api('/api/student/certificates'),
  getNotificationPreferences: () => api('/api/student/notifications/preferences'),
  updateNotificationPreferences: (preferences) => api('/api/student/notifications/preferences', { method: 'PUT', body: JSON.stringify({ preferences }) }),
  enrollCourse: (courseId) => api(`/api/student/courses/${courseId}/enroll`, { method: 'POST' }),
  getEnrolledCourses: () => api('/api/student/courses'),
  getCatalog: () => api('/api/student/courses/catalog'),
  startResumeCourse: (courseId) => api(`/api/student/courses/${courseId}/resume`),
  getCourseLessons: (courseId) => api(`/api/student/courses/${courseId}/lessons`),
  getCourseQuizzes: (courseId) => api(`/api/student/courses/${courseId}/quizzes`),
  getCourseAssignments: (courseId) => api(`/api/student/courses/${courseId}/assignments`),
  submitAssignment: (assignmentId, answer) => api(`/api/student/assignments/${assignmentId}/submissions`, { method: 'POST', body: JSON.stringify({ answer }) }),
  completeLesson: (courseId, lessonId) => api(`/api/student/courses/${courseId}/lessons/${lessonId}/complete`, { method: 'POST' }),
  startQuiz: (quizId) => api(`/api/student/quizzes/${quizId}/attempts`, { method: 'POST' }),
  submitQuiz: (attemptId, data) => api(`/api/student/quiz-attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  getQuizResult: (attemptId) => api(`/api/student/quiz-attempts/${attemptId}/result`),
  getNotifications: (limit = 20) => api(`/api/notifications?limit=${limit}`),
  getUnreadCount: () => api('/api/notifications/unread-count'),
  markNotificationRead: (id) => api(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => api('/api/notifications/read-all', { method: 'PUT' }),
  sendTestNotification: (type) => api('/api/student/notifications/test', { method: 'POST', body: JSON.stringify({ type }) }),
  applyTeacher: (data) => api('/api/student/teacher-application', { method: 'POST', body: JSON.stringify(data) }),
  getTeacherApplication: () => api('/api/student/teacher-application'),
};

const sessionKey = (attemptId) => `ai_lms_quiz_attempt_${attemptId}`;
export function saveQuizAttemptSession(attemptId, session) { sessionStorage.setItem(sessionKey(attemptId), JSON.stringify(session)); }
export function getQuizAttemptSession(attemptId) {
  try { return JSON.parse(sessionStorage.getItem(sessionKey(attemptId)) || 'null'); } catch { return null; }
}
