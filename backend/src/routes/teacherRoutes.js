/**
Author: HuyTG - CE182405
Created at: 29/09/2026
Description: Course Management
 */
const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter, RoleFilter } = require('../composition/http');
const TeacherCourseController = require('../controller/teacher/TeacherCourseController');
const TeacherQuizController = require('../controller/teacher/TeacherQuizController');
const TeacherQuestionController = require('../controller/teacher/TeacherQuestionController');
const TeacherAssignmentController = require('../controller/teacher/TeacherAssignmentController');
const LessonManagementController = require('../controller/learning/LessonManagementController');
const MaterialController = require('../controller/learning/MaterialController');
const ReviewController = require('../controller/engagement/ReviewController');
const AIContentController = require('../controller/teacher/AIContentController');
const { uploadCourseThumbnail } = require('../utils/upload/CourseThumbnailUpload');
const { uploadMaterial } = require('../utils/upload/MaterialUpload');
const { uploadLessonVideo } = require('../utils/upload/LessonVideoUpload');

const router = express.Router();
router.use(NoCacheFilter, AuthFilter, RoleFilter('teacher'));
router.use(require('../filter/TeachingPermissionFilter'));
router.get('/reviews', ReviewController.list.bind(ReviewController));
router.get('/reviews/:reviewId', ReviewController.getById.bind(ReviewController));
router.post('/reviews/:reviewId/reply', ReviewController.reply.bind(ReviewController));
router.get('/dashboard', TeacherCourseController.getDashboard.bind(TeacherCourseController));
router.get('/categories', TeacherCourseController.listCategories.bind(TeacherCourseController));
router.post('/ai/content-generation', AIContentController.generate);
router.post('/uploads/course-thumbnail', uploadCourseThumbnail, TeacherCourseController.uploadThumbnail.bind(TeacherCourseController));
router.post('/uploads/lesson-video', uploadLessonVideo, TeacherCourseController.uploadVideo.bind(TeacherCourseController));
router.post('/courses', TeacherCourseController.create.bind(TeacherCourseController));
router.get('/courses', TeacherCourseController.list.bind(TeacherCourseController));
router.get('/courses/:courseId', TeacherCourseController.getById.bind(TeacherCourseController));
router.patch('/courses/:courseId', TeacherCourseController.update.bind(TeacherCourseController));
router.delete('/courses/:courseId', TeacherCourseController.remove.bind(TeacherCourseController));
router.post('/courses/:courseId/submit-review', TeacherCourseController.submitForReview.bind(TeacherCourseController));
router.post('/courses/:courseId/publish', TeacherCourseController.publish.bind(TeacherCourseController));
router.post('/courses/:courseId/unpublish', TeacherCourseController.unpublish.bind(TeacherCourseController));
router.post('/courses/:courseId/archive', TeacherCourseController.archive.bind(TeacherCourseController));
router.post('/courses/:courseId/restore', TeacherCourseController.restore.bind(TeacherCourseController));
router.get('/courses/:courseId/lessons', TeacherCourseController.listLessons.bind(TeacherCourseController));
router.post('/courses/:courseId/lessons', TeacherCourseController.createLesson.bind(TeacherCourseController));
router.patch('/courses/:courseId/lessons/:lessonId', TeacherCourseController.updateLesson.bind(TeacherCourseController));
router.delete('/courses/:courseId/lessons/:lessonId', TeacherCourseController.deleteLesson.bind(TeacherCourseController));

// Iteration 2: Teacher Lesson Management (Reorder, direct update/delete)
router.put('/courses/:courseId/lessons/reorder', LessonManagementController.reorder.bind(LessonManagementController));
router.put('/lessons/:lessonId', LessonManagementController.update.bind(LessonManagementController));
router.delete('/lessons/:lessonId', LessonManagementController.remove.bind(LessonManagementController));

// Iteration 2: Teacher Learning Materials (Upload, List, Update, Delete)
router.post('/lessons/:lessonId/materials', uploadMaterial, MaterialController.upload.bind(MaterialController));
router.get('/lessons/:lessonId/materials', MaterialController.list.bind(MaterialController));
router.put('/materials/:materialId', MaterialController.update.bind(MaterialController));
router.patch('/materials/:materialId', MaterialController.update.bind(MaterialController));
router.delete('/materials/:materialId', MaterialController.remove.bind(MaterialController));

router.post('/courses/:courseId/quizzes', TeacherQuizController.create.bind(TeacherQuizController));
router.get('/courses/:courseId/quizzes', TeacherQuizController.list.bind(TeacherQuizController));
router.post('/courses/:courseId/assignments', TeacherAssignmentController.create.bind(TeacherAssignmentController));
router.get('/courses/:courseId/assignments', TeacherAssignmentController.list.bind(TeacherAssignmentController));
router.patch('/assignment-submissions/:submissionId/grade', TeacherAssignmentController.grade.bind(TeacherAssignmentController));
router.get('/quizzes/:quizId', TeacherQuizController.getById.bind(TeacherQuizController));
router.patch('/quizzes/:quizId', TeacherQuizController.update.bind(TeacherQuizController));
router.delete('/quizzes/:quizId', TeacherQuizController.remove.bind(TeacherQuizController));
router.post('/quizzes/:quizId/questions', TeacherQuestionController.create.bind(TeacherQuestionController));
router.post('/quizzes/:quizId/questions/batch-link', TeacherQuestionController.batchLink.bind(TeacherQuestionController));
router.post('/quizzes/:quizId/questions/:questionId/link', TeacherQuestionController.link.bind(TeacherQuestionController));
router.delete('/quizzes/:quizId/questions/:questionId/unlink', TeacherQuestionController.unlink.bind(TeacherQuestionController));
router.get('/questions', TeacherQuestionController.list.bind(TeacherQuestionController));
router.post('/questions', TeacherQuestionController.createInBank.bind(TeacherQuestionController));
router.get('/questions/:questionId', TeacherQuestionController.getById.bind(TeacherQuestionController));
router.patch('/questions/:questionId', TeacherQuestionController.update.bind(TeacherQuestionController));
router.delete('/questions/:questionId', TeacherQuestionController.remove.bind(TeacherQuestionController));
module.exports = router;

