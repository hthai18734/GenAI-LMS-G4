/**
Author: HuyTG - CE182405
Created at: 29/09/2026
Description: Course Management
 */
const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

class CourseModerationService {
  constructor({ courseRepository, lessonRepository, notificationRepository, courseService } = {}) {
    this.courseRepository = courseRepository;
    this.lessonRepository = lessonRepository;
    this.notificationRepository = notificationRepository;
    this.courseService = courseService;
  }
  assertValidId(id) {
    if (!isValidIdentifier(id)) throw new ServiceError(400, 'Course ID is invalid.');
  }

  async getModerationQueue(query) {
    return this.courseRepository.findModerationQueue(query);
  }

  async loadCourse(courseId) {
    this.assertValidId(courseId);
    const course = await this.courseRepository.findByIdForModeration(courseId);
    if (!course) throw new ServiceError(404, 'Course not found.');
    return course;
  }

  async getCourseForModeration(courseId) {
    const course = await this.loadCourse(courseId);
    const lessons = await this.lessonRepository.findByCourseId(courseId);
    const serialized = course;
    return { ...serialized, lessons };
  }

  async approveCourse(courseId, adminUser) {
    const course = await this.loadCourse(courseId);
    this.courseService.assertTransition(course.status, COURSE_STATUS.APPROVED, 'approve');
    const updated = await this.courseService.transitionCourse(course, COURSE_STATUS.APPROVED, {
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

  async rejectCourse(courseId, adminUser, input) {
    const course = await this.loadCourse(courseId);
    this.courseService.assertTransition(course.status, COURSE_STATUS.REJECTED, 'reject');
    const reason = input.reason;
    const updated = await this.courseService.transitionCourse(course, COURSE_STATUS.REJECTED, {
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
      if (recipientId) await this.notificationRepository.create({ recipientId, ...notification, type: 'course' });
    } catch {
      // Course moderation remains successful if a best-effort notification fails.
    }
  }
}

module.exports = CourseModerationService;
