const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter, RoleFilter } = require('../filter/AuthFilter');
const AdminCourseController = require('../controller/admin/AdminCourseController');
const CategoryController = require('../controller/admin/CategoryController');
const router = express.Router();
const AdminController = require('../controller/admin/AdminController');
router.use(NoCacheFilter, AuthFilter, RoleFilter('admin'));
router.get('/dashboard', (req, res, next) => AdminController.getDashboardStats(req, res, next));
router.get('/stats', (req, res, next) => AdminController.getDashboardStats(req, res, next));
router.get('/teacher-applications', (req, res, next) =>
  AdminController.getTeacherApplications(req, res, next),
);
router.post('/teacher-applications/:id/approve', (req, res, next) =>
  AdminController.approveTeacherApplication(req, res, next),
);
router.post('/teacher-applications/:id/reject', (req, res, next) =>
  AdminController.rejectTeacherApplication(req, res, next),
);
router.get(
  '/courses/moderation',
  AdminCourseController.listModerationQueue.bind(AdminCourseController),
);
router.get(
  '/courses/moderation/:courseId',
  AdminCourseController.getForModeration.bind(AdminCourseController),
);
router.post(
  '/courses/:courseId/approve',
  AdminCourseController.approve.bind(AdminCourseController),
);
router.post('/courses/:courseId/reject', AdminCourseController.reject.bind(AdminCourseController));
router.post('/categories', CategoryController.create.bind(CategoryController));
router.get('/categories', CategoryController.list.bind(CategoryController));
router.get('/categories/:categoryId', CategoryController.getById.bind(CategoryController));
router.patch('/categories/:categoryId', CategoryController.update.bind(CategoryController));
router.delete('/categories/:categoryId', CategoryController.remove.bind(CategoryController));
module.exports = router;
