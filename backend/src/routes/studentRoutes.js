const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter, RoleFilter } = require('../composition/http');
const StudentController = require('../controller/student/StudentController');
const StudentQuizController = require('../controller/student/StudentQuizController');
const StudentAssignmentController = require('../controller/student/StudentAssignmentController');
const LessonManagementController = require('../controller/learning/LessonManagementController');
const MaterialController = require('../controller/learning/MaterialController');
const WishlistController = require('../controller/learning/WishlistController');
const LearningGoalController = require('../controller/learning/LearningGoalController');
const ReviewController = require('../controller/engagement/ReviewController');

const router = express.Router();
router.use(NoCacheFilter);
router.use(AuthFilter);

// UC-4.1 View Profile & UC-4.2 Update Profile (Available to any authenticated user: student, teacher, admin)
router.get('/profile', StudentController.getProfile.bind(StudentController));
router.put('/profile', StudentController.updateProfile.bind(StudentController));

// UC-10.4 Start/Resume Course & Study Lessons (Open to student, teacher owner, admin preview)
router.get('/courses/:courseId/resume', RoleFilter('student', 'teacher', 'admin'), StudentController.startResumeCourse.bind(StudentController));
router.get('/courses/:courseId/lessons', RoleFilter('student', 'teacher', 'admin'), StudentController.getCourseLessons.bind(StudentController));
router.get('/courses/:courseId/quizzes', RoleFilter('student', 'teacher', 'admin'), StudentQuizController.listByCourse.bind(StudentQuizController));
router.get('/courses/:courseId/assignments', RoleFilter('student', 'teacher', 'admin'), StudentAssignmentController.listAvailable.bind(StudentAssignmentController));

// Iteration 2: I2-02 View Lesson & I2-07 / I2-10 Materials (Open to student, teacher, admin)
router.get('/courses/:courseId/lessons/:lessonId', RoleFilter('student', 'teacher', 'admin'), LessonManagementController.getDetail.bind(LessonManagementController));
router.get('/lessons/:lessonId/materials', RoleFilter('student', 'teacher', 'admin'), MaterialController.list.bind(MaterialController));
router.get('/materials/:materialId/download', RoleFilter('student', 'teacher', 'admin'), MaterialController.download.bind(MaterialController));

// Student-only features
router.use(RoleFilter('student'));
router.post('/vouchers/apply',require('../controller/admin/VoucherController').apply);
router.get('/vouchers/available',require('../controller/admin/VoucherController').available);
router.get('/reviews', ReviewController.list.bind(ReviewController));
router.get('/reviews/:reviewId', ReviewController.getById.bind(ReviewController));
router.post('/courses/:courseId/reviews', ReviewController.create.bind(ReviewController));
router.patch('/reviews/:reviewId', ReviewController.update.bind(ReviewController));
router.put('/reviews/:reviewId', ReviewController.update.bind(ReviewController));
router.delete('/reviews/:reviewId', ReviewController.remove.bind(ReviewController));

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

router.post('/courses/:courseId/lessons/:lessonId/complete', StudentController.completeLesson.bind(StudentController));
router.post('/assignments/:assignmentId/submissions', StudentQuizController.submitAssignment.bind(StudentQuizController));

// Iteration 2: I2-14, I2-15, I2-16 Course Wishlist
router.post('/wishlist/:courseId', WishlistController.add.bind(WishlistController));
router.get('/wishlist', WishlistController.list.bind(WishlistController));
router.delete('/wishlist/:courseId', WishlistController.remove.bind(WishlistController));

// Iteration 2: I2-22, I2-23, I2-24, I2-25 Learning Goals
router.post('/learning-goals', LearningGoalController.create.bind(LearningGoalController));
router.get('/learning-goals', LearningGoalController.list.bind(LearningGoalController));
router.put('/learning-goals/:goalId', LearningGoalController.update.bind(LearningGoalController));
router.patch('/learning-goals/:goalId', LearningGoalController.update.bind(LearningGoalController));
router.delete('/learning-goals/:goalId', LearningGoalController.remove.bind(LearningGoalController));

// UC-12.5 to UC-12.7 Quiz attempts and results
router.post('/quizzes/:quizId/attempts', StudentQuizController.start.bind(StudentQuizController));
router.post('/quiz-attempts/:attemptId/submit', StudentQuizController.submit.bind(StudentQuizController));
router.get('/quiz-attempts/:attemptId/result', StudentQuizController.getResult.bind(StudentQuizController));

// UC-5 Teacher Application
router.get('/teacher-application', StudentController.getTeacherApplicationStatus.bind(StudentController));
router.post('/teacher-application', StudentController.applyTeacher.bind(StudentController));

module.exports = router;


