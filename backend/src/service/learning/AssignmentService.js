const AssignmentDAO = require('../../dao/learning/AssignmentDAO');
const CourseService = require('./CourseService');
const LessonDAO = require('../../dao/learning/LessonDAO');
const ServiceError = require('../common/ServiceError');

class AssignmentService {
  async createAssignment(courseId, user, dto) {
    const course = await CourseService.getOwnedCourse(courseId, user);
    CourseService.assertContentEditable(course);
    const data = dto.toObject();
    if (data.lessonId) {
      const lesson = await LessonDAO.findById(data.lessonId);
      if (!lesson || String(lesson.courseId) !== String(course._id)) throw new ServiceError(404, 'Lesson not found.');
    }
    return AssignmentDAO.create({ ...data, courseId: course._id });
  }

  async listAssignments(courseId, user) {
    const course = await CourseService.getOwnedCourse(courseId, user);
    return AssignmentDAO.findByCourseId(course._id);
  }
}

module.exports = new AssignmentService();
