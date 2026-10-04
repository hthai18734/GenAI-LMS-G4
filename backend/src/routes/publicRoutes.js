const express = require('express');
const router = express.Router();
const PublicController = require('../controller/public/PublicController');

// UC-1.1 View Homepage
router.get('/home', (req, res, next) => PublicController.getHomepage(req, res, next));

// UC-1.6 View Public Categories
router.get('/categories', (req, res, next) => PublicController.getPublicCategories(req, res, next));

// UC-1.3 Search Courses (Placed before :id)
router.get('/courses/search', (req, res, next) => PublicController.searchCourses(req, res, next));

// UC-1.4 Filter & Sort Courses (Placed before :id)
router.get('/courses/filter', (req, res, next) => PublicController.filterAndSortCourses(req, res, next));

// UC-1.5 View Course Detail
router.get('/courses/:id', (req, res, next) => PublicController.getCourseDetail(req, res, next));

// UC-1.2 Browse Courses
router.get('/courses', (req, res, next) => PublicController.browseCourses(req, res, next));

// UC-1.6 View Public Teacher Profile
router.get('/teachers/:teacherId', (req, res, next) => PublicController.getPublicTeacherProfile(req, res, next));

module.exports = router;
