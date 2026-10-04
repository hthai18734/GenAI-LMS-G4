const mongoose = require('mongoose');
const CourseDAO = require('../../dao/learning/CourseDAO');
const LessonDAO = require('../../dao/learning/LessonDAO');
const NotificationDAO = require('../../dao/engagement/NotificationDAO');
const CourseService = require('../learning/CourseService');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

class CourseModerationService {
  assertValidId(id) {
    if (!mongoose.isValidObjectId(id)) throw new ServiceError(400, 'Course ID is invalid.');
  }

  async getModerationQueue(queryDto) {
    return CourseDAO.findModerationQueue(queryDto.toObject());
  }

  async loadCourse(courseId) {
    this.assertValidId(courseId);
    const course = await CourseDAO.findByIdForModeration(courseId);
    if (!course) throw new ServiceError(404, 'Course not found.');
    return course;
  }

  async getCourseForModeration(courseId) {
    const course = await this.loadCourse(courseId);
    const lessons = await LessonDAO.findByCourseId(courseId);
    const serialized = typeof course.toObject === 'function' ? course.toObject() : course;
    return { ...serialized, lessons };
  }

  async approveCourse(courseId, adminUser) {
    const course = await this.loadCourse(courseId);
    CourseService.assertTransition(course.status, COURSE_STATUS.APPROVED, 'approve');
    const updated = await CourseService.transitionCourse(course, COURSE_STATUS.APPROVED, {
      moderatedBy: adminUser._id,
      moderatedAt: new Date(),
      rejectionReason: null,
    });
    await this.notifyTeacher(course, {
      title: 'Course approved',
      message: `Your course "${course.title}" has been approved. You can publish it when you are ready.`,
    });
    return updated;
  }

  async rejectCourse(courseId, adminUser, dto) {
    const course = await this.loadCourse(courseId);
    CourseService.assertTransition(course.status, COURSE_STATUS.REJECTED, 'reject');
    const reason = dto.toObject().reason;
    const updated = await CourseService.transitionCourse(course, COURSE_STATUS.REJECTED, {
      rejectionReason: reason,
      moderatedBy: adminUser._id,
      moderatedAt: new Date(),
    });
    await this.notifyTeacher(course, {
      title: 'Course changes requested',
      message: `Your course "${course.title}" was rejected. Reason: ${reason}`,
    });
    return updated;
  }

  async notifyTeacher(course, notification) {
    try {
      const recipientId = course.teacherId?._id || course.teacherId;
      if (recipientId)
        await NotificationDAO.create({ recipientId, ...notification, type: 'course' });
    } catch {}
  }
}

module.exports = new CourseModerationService();
