/**
Author: HuyTG - CE182405
Created at: 01/10/2026
Description: Category Management
 */
const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter, RoleFilter } = require('../composition/http');
const AdminCourseController = require('../composition/http').controllers.AdminCourseController;
const CategoryController = require('../composition/http').controllers.CategoryController;
const AccountController = require('../composition/http').controllers.AccountController;
const ReviewController = require('../composition/http').controllers.ReviewController;
const router = express.Router();
const AdminController = require('../composition/http').controllers.AdminController;
router.use(NoCacheFilter, AuthFilter, RoleFilter('admin'));
const VoucherController=require('../composition/http').controllers.VoucherController;
router.get('/vouchers',VoucherController.list);
router.post('/vouchers',VoucherController.create);
router.get('/vouchers/:id',VoucherController.detail);
router.put('/vouchers/:id',VoucherController.update);
router.delete('/vouchers/:id',VoucherController.remove);
router.patch('/vouchers/:id/status',VoucherController.toggle);
router.get('/vouchers/:id/redemptions',VoucherController.history);
const AdminTeacherController = require('../composition/http').controllers.AdminTeacherController;
router.get('/teachers', AdminTeacherController.list.bind(AdminTeacherController));
router.get('/teachers/:teacherId', AdminTeacherController.detail.bind(AdminTeacherController));
router.patch('/teachers/:teacherId/suspend', AdminTeacherController.suspend.bind(AdminTeacherController));
router.patch('/teachers/:teacherId/unsuspend', AdminTeacherController.unsuspend.bind(AdminTeacherController));
router.delete('/reviews/:reviewId', ReviewController.remove.bind(ReviewController));
router.get('/reviews', ReviewController.list.bind(ReviewController));
router.get('/reviews/:reviewId', ReviewController.getById.bind(ReviewController));
router.patch('/reviews/:reviewId/status', ReviewController.moderate.bind(ReviewController));
router.put('/reviews/:reviewId/status', ReviewController.moderate.bind(ReviewController));
router.get('/users', AccountController.list.bind(AccountController));
router.post('/users', AccountController.create.bind(AccountController));
router.get('/users/:userId', AccountController.getById.bind(AccountController));
router.patch('/users/:userId', AccountController.update.bind(AccountController));
router.delete('/users/:userId', AccountController.remove.bind(AccountController));
router.patch('/users/:userId/role', AccountController.updateRole.bind(AccountController));
router.patch('/users/:userId/status', AccountController.updateStatus.bind(AccountController));
router.get('/dashboard', (req, res, next) => AdminController.getDashboardStats(req, res, next));
router.get('/stats', (req, res, next) => AdminController.getDashboardStats(req, res, next));
router.get('/teacher-applications', (req, res, next) => AdminController.getTeacherApplications(req, res, next));
router.post('/teacher-applications/:id/approve', (req, res, next) => AdminController.approveTeacherApplication(req, res, next));
router.post('/teacher-applications/:id/reject', (req, res, next) => AdminController.rejectTeacherApplication(req, res, next));
router.get('/courses/moderation', AdminCourseController.listModerationQueue.bind(AdminCourseController));
router.get('/courses/moderation/:courseId', AdminCourseController.getForModeration.bind(AdminCourseController));
router.post('/courses/:courseId/approve', AdminCourseController.approve.bind(AdminCourseController));
router.post('/courses/:courseId/reject', AdminCourseController.reject.bind(AdminCourseController));
router.post('/categories', CategoryController.create.bind(CategoryController));
router.get('/categories', CategoryController.list.bind(CategoryController));
router.get('/categories/:categoryId', CategoryController.getById.bind(CategoryController));
router.patch('/categories/:categoryId', CategoryController.update.bind(CategoryController));
router.delete('/categories/:categoryId', CategoryController.remove.bind(CategoryController));
module.exports = router;
