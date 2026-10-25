const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter, RoleFilter } = require('../composition/http');
const StudentController = require('../composition/http').controllers.StudentController;
const LessonManagementController = require('../composition/http').controllers.LessonManagementController;
const MaterialController = require('../composition/http').controllers.MaterialController;
const WishlistController = require('../composition/http').controllers.WishlistController;
const LearningGoalController = require('../composition/http').controllers.LearningGoalController;
const EnrollmentLifecycleController = require('../composition/http').controllers.EnrollmentLifecycleController;
const ProgressTrackingController = require('../composition/http').controllers.ProgressTrackingController;
const LearningContentReportController = require('../composition/http').controllers.LearningContentReportController;
const LearningStatisticsController = require('../composition/http').controllers.LearningStatisticsController;
const ReviewController = require('../composition/http').controllers.ReviewController;
const { uploadMaterial } = require('../utils/upload/MaterialUpload');

const router = express.Router();
router.use(NoCacheFilter);
router.use(AuthFilter);
router.use(require('../filter/TeachingPermissionFilter'));

// Student alias routes: /api/me/... & /api/courses/:courseId/enroll
router.post('/courses/:courseId/enroll', RoleFilter('student'), StudentController.enrollCourse.bind(StudentController));
router.get('/courses/:courseId/enrollment-status', RoleFilter('student'), StudentController.getEnrollmentStatus.bind(StudentController));
router.get('/me/enrollments', RoleFilter('student'), StudentController.getEnrolledCourses.bind(StudentController));

// Course Reviews (Iteration 2)
router.post('/courses/:courseId/reviews', RoleFilter('student'), ReviewController.create.bind(ReviewController));
router.patch('/reviews/:reviewId', RoleFilter('student'), ReviewController.update.bind(ReviewController));
router.put('/reviews/:reviewId', RoleFilter('student'), ReviewController.update.bind(ReviewController));
router.delete('/reviews/:reviewId', ReviewController.remove.bind(ReviewController));
router.get('/reviews', ReviewController.list.bind(ReviewController));
router.get('/reviews/:reviewId', ReviewController.getById.bind(ReviewController));

// Course Wishlist (I2-13, I2-14, I2-15)
router.post('/me/wishlist/:courseId', RoleFilter('student'), WishlistController.add.bind(WishlistController));
router.get('/me/wishlist', RoleFilter('student'), WishlistController.list.bind(WishlistController));
router.delete('/me/wishlist/:courseId', RoleFilter('student'), WishlistController.remove.bind(WishlistController));

// Personal Learning Goals (I3-07, I3-08, I3-09, I3-10)
router.post('/me/learning-goals', RoleFilter('student'), LearningGoalController.create.bind(LearningGoalController));
router.get('/me/learning-goals', RoleFilter('student'), LearningGoalController.list.bind(LearningGoalController));
router.put('/me/learning-goals/:goalId', RoleFilter('student'), LearningGoalController.update.bind(LearningGoalController));
router.patch('/me/learning-goals/:goalId', RoleFilter('student'), LearningGoalController.update.bind(LearningGoalController));
router.delete('/me/learning-goals/:goalId', RoleFilter('student'), LearningGoalController.remove.bind(LearningGoalController));

// Learning Lesson & Material (I2-02, I2-07, I2-10)
router.get('/courses/:courseId/lessons/:lessonId', LessonManagementController.getDetail.bind(LessonManagementController));
router.post('/lessons/:lessonId/access', LessonManagementController.recordAccess.bind(LessonManagementController));
router.get('/lessons/:lessonId/materials', MaterialController.list.bind(MaterialController));
router.get('/materials/:materialId/download', MaterialController.download.bind(MaterialController));

// Teacher endpoints under /api/teacher/... (I2-01, I2-03, I2-04, I2-05, I2-06, I2-07, I2-08, I2-09)
router.post('/teacher/courses/:courseId/lessons', RoleFilter('teacher'), LessonManagementController.create.bind(LessonManagementController));
router.put('/teacher/lessons/:lessonId', RoleFilter('teacher'), LessonManagementController.update.bind(LessonManagementController));
router.delete('/teacher/lessons/:lessonId', RoleFilter('teacher'), LessonManagementController.remove.bind(LessonManagementController));
router.put('/teacher/courses/:courseId/lessons/reorder', RoleFilter('teacher'), LessonManagementController.reorder.bind(LessonManagementController));
router.post('/teacher/lessons/:lessonId/materials', RoleFilter('teacher'), uploadMaterial, MaterialController.upload.bind(MaterialController));
router.get('/teacher/lessons/:lessonId/materials', RoleFilter('teacher'), MaterialController.list.bind(MaterialController));
router.put('/teacher/materials/:materialId', RoleFilter('teacher'), MaterialController.update.bind(MaterialController));
router.patch('/teacher/materials/:materialId', RoleFilter('teacher'), MaterialController.update.bind(MaterialController));
router.delete('/teacher/materials/:materialId', RoleFilter('teacher'), MaterialController.remove.bind(MaterialController));

// ─── ITERATION 3 ROUTES ─────────────────────────────────────────────
// I3-01: Cancel Enrollment
router.post('/enrollments/:enrollmentId/cancel', RoleFilter('student'), EnrollmentLifecycleController.cancelEnrollment.bind(EnrollmentLifecycleController));

// I3-02: Complete Course & Issue Certificate
router.post('/enrollments/:enrollmentId/complete', RoleFilter('student'), EnrollmentLifecycleController.completeCourse.bind(EnrollmentLifecycleController));

// I3-03: Mark Lesson Complete
router.put('/lessons/:lessonId/completion', RoleFilter('student'), ProgressTrackingController.markLessonComplete.bind(ProgressTrackingController));
router.post('/lessons/:lessonId/completion', RoleFilter('student'), ProgressTrackingController.markLessonComplete.bind(ProgressTrackingController));

// I3-04: View Progress
router.get('/courses/:courseId/progress', ProgressTrackingController.viewCourseProgress.bind(ProgressTrackingController));

// I3-05: Track Video Progress (Medium)
router.post('/videos/:videoId/progress/heartbeat', ProgressTrackingController.heartbeat.bind(ProgressTrackingController));
router.get('/videos/:videoId/progress', ProgressTrackingController.getVideoProgress.bind(ProgressTrackingController));

// I3-07: Report Learning Content Issue
router.post('/learning-content-reports', RoleFilter('student'), LearningContentReportController.createReport.bind(LearningContentReportController));
router.get('/me/learning-content-reports', RoleFilter('student'), LearningContentReportController.listMyReports.bind(LearningContentReportController));

// I3-08: Resolve Learning Content Report
router.get('/teacher/learning-content-reports', RoleFilter('teacher'), LearningContentReportController.listTeacherReports.bind(LearningContentReportController));
router.get('/teacher/learning-content-reports/:reportId', RoleFilter('teacher'), LearningContentReportController.getReportDetail.bind(LearningContentReportController));
router.put('/teacher/learning-content-reports/:reportId/status', RoleFilter('teacher'), LearningContentReportController.resolveReport.bind(LearningContentReportController));

// I3-10: View Learning Statistics (Medium)
router.get('/me/learning-statistics', RoleFilter('student'), LearningStatisticsController.getStatistics.bind(LearningStatisticsController));
router.get('/student/learning-statistics', RoleFilter('student'), LearningStatisticsController.getStatistics.bind(LearningStatisticsController));

module.exports = router;
