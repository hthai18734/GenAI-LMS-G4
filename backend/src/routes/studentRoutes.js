const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter, RoleFilter } = require('../filter/AuthFilter');
const StudentController = require('../controller/student/StudentController');

const router = express.Router();
router.use(NoCacheFilter);
router.use(AuthFilter);

router.get('/profile', StudentController.getProfile.bind(StudentController));
router.put('/profile', StudentController.updateProfile.bind(StudentController));

router.use(RoleFilter('student'));

router.get('/dashboard', StudentController.getDashboard.bind(StudentController));

router.get('/learning-history', StudentController.getLearningHistory.bind(StudentController));

router.get('/certificates', StudentController.getCertificates.bind(StudentController));

router.get(
  '/notifications/preferences',
  StudentController.getNotificationPreferences.bind(StudentController),
);
router.put(
  '/notifications/preferences',
  StudentController.updateNotificationPreferences.bind(StudentController),
);

router.get('/notifications', StudentController.getNotifications.bind(StudentController));
router.get('/notifications/unread-count', StudentController.getUnreadCount.bind(StudentController));
router.put(
  '/notifications/:notificationId/read',
  StudentController.markNotificationRead.bind(StudentController),
);
router.put(
  '/notifications/read-all',
  StudentController.markAllNotificationsRead.bind(StudentController),
);
router.post('/notifications/test', StudentController.sendTestNotification.bind(StudentController));

router.get('/courses/catalog', StudentController.getCatalog.bind(StudentController));
router.post('/courses/:courseId/enroll', StudentController.enrollCourse.bind(StudentController));

router.get('/courses', StudentController.getEnrolledCourses.bind(StudentController));

router.get(
  '/courses/:courseId/resume',
  StudentController.startResumeCourse.bind(StudentController),
);
router.get(
  '/courses/:courseId/lessons',
  StudentController.getCourseLessons.bind(StudentController),
);
router.post(
  '/courses/:courseId/lessons/:lessonId/complete',
  StudentController.completeLesson.bind(StudentController),
);

router.get(
  '/teacher-application',
  StudentController.getTeacherApplicationStatus.bind(StudentController),
);
router.post('/teacher-application', StudentController.applyTeacher.bind(StudentController));

module.exports = router;
