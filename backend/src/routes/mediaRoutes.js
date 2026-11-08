const express = require('express');
const { AuthFilter, RoleFilter } = require('../composition/http');
const LessonVideoController = require('../composition/http').controllers.LessonVideoController;

const router = express.Router();
router.use(AuthFilter, RoleFilter('student', 'teacher', 'admin'));
router.get('/lesson-videos/:filename', LessonVideoController.stream);

module.exports = router;
