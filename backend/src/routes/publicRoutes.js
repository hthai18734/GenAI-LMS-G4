const express = require('express');
const router = express.Router();
const PublicController = require('../controller/public/PublicController');

router.get('/home', (req, res, next) => PublicController.getHomepage(req, res, next));

router.get('/categories', (req, res, next) => PublicController.getPublicCategories(req, res, next));

router.get('/courses/search', (req, res, next) => PublicController.searchCourses(req, res, next));

router.get('/courses/filter', (req, res, next) =>
  PublicController.filterAndSortCourses(req, res, next),
);

router.get('/courses/:id', (req, res, next) => PublicController.getCourseDetail(req, res, next));

router.get('/courses', (req, res, next) => PublicController.browseCourses(req, res, next));

router.get('/teachers/:teacherId', (req, res, next) =>
  PublicController.getPublicTeacherProfile(req, res, next),
);

module.exports = router;
