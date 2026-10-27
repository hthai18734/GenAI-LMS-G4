/**
Author: HuyTG - CE182405
Created at: 29/09/2026
Description: Course Management
 */
const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const LoggerUtil = require('../../utils/common/LoggerUtil');
const { COURSE_STATUS, canTransition } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

class CourseService {
  constructor({ courseRepository, categoryRepository, lessonRepository, materialRepository, courseCleanupRepository } = {}) {
    this.courseRepository = courseRepository;
    this.categoryRepository = categoryRepository;
    this.lessonRepository = lessonRepository;
    this.materialRepository = materialRepository;
    this.courseCleanupRepository = courseCleanupRepository;
  }
  assertValidId(id, field = 'Course') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} ID is invalid.`);
  }

  async createCourse(user, input) {
    const data = { ...input };
    await this.resolveCategory(data);
    return this.courseRepository.create({ ...data, teacherId: user._id, status: COURSE_STATUS.DRAFT });
  }

  async getTeacherCourses(user, query) {
    const result = await this.courseRepository.findAllByTeacher(user._id, query);
    const courses = await Promise.all(result.courses.map(async (course) => {
      const lessonCount = await this.lessonRepository.countValidByCourseId(course._id);
      const serialized = typeof course.toObject === 'function' ? course.toObject() : course;
      return { ...serialized, lessonCount, contentComplete: this.isMetadataComplete(course) && lessonCount > 0 };
    }));
    return { ...result, courses };
  }

  async getTeacherCourse(courseId, user) {
    return this.getOwnedCourse(courseId, user);
  }

  async getOwnedCourse(courseId, user) {
    this.assertValidId(courseId);
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new ServiceError(404, 'Course not found.');
    this.assertTeacherOwnsCourse(course, user);
    return course;
  }

  assertTeacherOwnsCourse(course, user) {
    if (String(course.teacherId) !== String(user._id)) throw new ServiceError(403, 'You do not have permission to perform this action.');
  }

  async updateCourse(courseId, user, input) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertContentEditable(course);
    const updates = { ...input };
    await this.resolveCategory(updates, course);
    return this.courseRepository.update(courseId, updates);
  }

  async deleteCourse(courseId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    if (course.status === COURSE_STATUS.PENDING_REVIEW) throw new ServiceError(409, 'A course pending review cannot be deleted.');

    // Soft-delete the course
    const deletedCourse = await this.courseRepository.softDelete(courseId);

    // Persistence-specific cleanup is isolated behind the Repository boundary.
    try {
      await this.courseCleanupRepository.removeAssociatedData(courseId);
    } catch (cleanupError) {
      LoggerUtil.error('Cascading course deletion failed', cleanupError, { courseId });
    }

    return deletedCourse;
  }

  async submitForReview(courseId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertTransition(course.status, COURSE_STATUS.PENDING_REVIEW, 'submit for review');
    await this.assertContentComplete(course);
    return this.transitionCourse(course, COURSE_STATUS.PENDING_REVIEW, {
      submittedForReviewAt: new Date(),
      rejectionReason: null,
      moderatedBy: null,
      moderatedAt: null,
    });
  }

  async publishCourse(courseId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertTransition(course.status, COURSE_STATUS.PUBLIC, 'publish');
    await this.assertContentComplete(course);
    return this.transitionCourse(course, COURSE_STATUS.PUBLIC);
  }

  async unpublishCourse(courseId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertTransition(course.status, COURSE_STATUS.APPROVED, 'unpublish');
    return this.transitionCourse(course, COURSE_STATUS.APPROVED);
  }

  async archiveCourse(courseId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertTransition(course.status, COURSE_STATUS.ARCHIVED, 'archive');
    return this.transitionCourse(course, COURSE_STATUS.ARCHIVED);
  }

  async restoreCourse(courseId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertTransition(course.status, COURSE_STATUS.DRAFT, 'restore');
    return this.transitionCourse(course, COURSE_STATUS.DRAFT, {
      rejectionReason: null,
      moderatedBy: null,
      moderatedAt: null,
      submittedForReviewAt: null,
    });
  }

  assertTransition(currentStatus, targetStatus, action) {
    if (!canTransition(currentStatus, targetStatus)) {
      throw new ServiceError(409, `Cannot ${action} a course with status ${currentStatus}.`);
    }
  }

  async transitionCourse(course, targetStatus, updates = {}) {
    const updated = await this.courseRepository.transitionStatus(course._id, course.status, { ...updates, status: targetStatus });
    if (!updated) throw new ServiceError(409, 'The course status changed while the request was being processed. Please try again.');
    return updated;
  }

  isMetadataComplete(course) {
    return Boolean(course.title?.trim() && course.description?.trim());
  }

  async assertContentComplete(course) {
    if (!this.isMetadataComplete(course)) {
      throw new ServiceError(400, 'Course title and description are required before this action.');
    }
    const validLessonCount = await this.lessonRepository.countValidByCourseId(course._id);
    if (validLessonCount < 1) {
      throw new ServiceError(400, 'The course must contain at least one lesson with a title and content before this action.');
    }
  }

  async listLessons(courseId, user) {
    await this.getOwnedCourse(courseId, user);
    return this.lessonRepository.findByCourseId(courseId);
  }

  async createLesson(courseId, user, input) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertContentEditable(course);
    return this.lessonRepository.create({ ...input, courseId });
  }

  async updateLesson(courseId, lessonId, user, input) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertContentEditable(course);
    this.assertValidId(lessonId, 'Lesson');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || String(lesson.courseId) !== String(course._id)) throw new ServiceError(404, 'Lesson not found.');
    return this.lessonRepository.update(lessonId, { ...input });
  }

  async deleteLesson(courseId, lessonId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertContentEditable(course);
    this.assertValidId(lessonId, 'Lesson');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || String(lesson.courseId) !== String(course._id)) throw new ServiceError(404, 'Lesson not found.');
    await this.materialRepository.softDeleteByLessonId(lessonId);
    await this.lessonRepository.softDelete(lessonId);
    await this.lessonRepository.normalizeOrder(course._id);
    return true;
  }

  assertContentEditable(course) {
    if (![COURSE_STATUS.DRAFT, COURSE_STATUS.REJECTED, COURSE_STATUS.APPROVED].includes(course.status)) {
      throw new ServiceError(409, 'Course content cannot be edited in the current course status.');
    }
  }

  async resolveCategory(data, existingCourse = null) {
    if (data.categoryId === undefined) return;
    if (data.categoryId === null) {
      if (!data.category && existingCourse?.categoryId) data.category = null;
      return;
    }
    const category = await this.categoryRepository.findActiveById(data.categoryId);
    if (!category) throw new ServiceError(400, 'Selected category does not exist or is inactive.');
    data.category = category.name;
  }
}

module.exports = CourseService;
