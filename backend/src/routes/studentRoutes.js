const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter, RoleFilter } = require('../filter/AuthFilter');
const StudentController = require('../controller/student/StudentController');

const router = express.Router();
router.use(NoCacheFilter);
router.use(AuthFilter);

// UC-4.1 View Profile & UC-4.2 Update Profile (Available to any authenticated user: student, teacher, admin)
router.get('/profile', StudentController.getProfile.bind(StudentController));
router.put('/profile', StudentController.updateProfile.bind(StudentController));

// Student-only features
router.use(RoleFilter('student'));

// UC-4.3 View Dashboard
router.get('/dashboard', StudentController.getDashboard.bind(StudentController));

// UC-4.4 View Learning History
router.get('/learning-history', StudentController.getLearningHistory.bind(StudentController));

// UC-4.5 View Certificates
router.get('/certificates', StudentController.getCertificates.bind(StudentController));

// UC-4.6 Manage Notification Preferences
router.get('/notifications/preferences', StudentController.getNotificationPreferences.bind(StudentController));
router.put('/notifications/preferences', StudentController.updateNotificationPreferences.bind(StudentController));

// Notifications – List, Read, Mark All Read, Test
router.get('/notifications', StudentController.getNotifications.bind(StudentController));
router.get('/notifications/unread-count', StudentController.getUnreadCount.bind(StudentController));
router.put('/notifications/:notificationId/read', StudentController.markNotificationRead.bind(StudentController));
router.put('/notifications/read-all', StudentController.markAllNotificationsRead.bind(StudentController));
router.post('/notifications/test', StudentController.sendTestNotification.bind(StudentController));

// UC-10.1 Enroll Course & Catalog
router.get('/courses/catalog', StudentController.getCatalog.bind(StudentController));
router.post('/courses/:courseId/enroll', StudentController.enrollCourse.bind(StudentController));

// UC-10.3 View Enrolled Courses
router.get('/courses', StudentController.getEnrolledCourses.bind(StudentController));

// UC-10.4 Start/Resume Course & Study Lessons
router.get('/courses/:courseId/resume', StudentController.startResumeCourse.bind(StudentController));
router.get('/courses/:courseId/lessons', StudentController.getCourseLessons.bind(StudentController));
router.post('/courses/:courseId/lessons/:lessonId/complete', StudentController.completeLesson.bind(StudentController));

// UC-5 Teacher Application
router.get('/teacher-application', StudentController.getTeacherApplicationStatus.bind(StudentController));
router.post('/teacher-application', StudentController.applyTeacher.bind(StudentController));

module.exports = router;
