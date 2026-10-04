const mongoose = require('mongoose');
const CourseDAO = require('../../dao/learning/CourseDAO');
const CategoryDAO = require('../../dao/learning/CategoryDAO');
const LessonDAO = require('../../dao/learning/LessonDAO');
const { COURSE_STATUS, canTransition } = require('../../model/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

class CourseService {
  assertValidId(id, field = 'Course') {
    if (!mongoose.isValidObjectId(id)) throw new ServiceError(400, `${field} ID is invalid.`);
  }

  async createCourse(user, dto) {
    const data = dto.toObject();
    await this.resolveCategory(data);
    return CourseDAO.create({ ...data, teacherId: user._id, status: COURSE_STATUS.DRAFT });
  }

  async getTeacherCourses(user, queryDto) {
    const result = await CourseDAO.findAllByTeacher(user._id, queryDto.toObject());
    const courses = await Promise.all(
      result.courses.map(async (course) => {
        const lessonCount = await LessonDAO.countValidByCourseId(course._id);
        const serialized = typeof course.toObject === 'function' ? course.toObject() : course;
        return {
          ...serialized,
          lessonCount,
          contentComplete: this.isMetadataComplete(course) && lessonCount > 0,
        };
      }),
    );
    return { ...result, courses };
  }

  async getTeacherCourse(courseId, user) {
    return this.getOwnedCourse(courseId, user);
  }

  async getOwnedCourse(courseId, user) {
    this.assertValidId(courseId);
    const course = await CourseDAO.findById(courseId);
    if (!course) throw new ServiceError(404, 'Course not found.');
    this.assertTeacherOwnsCourse(course, user);
    return course;
  }

  assertTeacherOwnsCourse(course, user) {
    if (String(course.teacherId) !== String(user._id))
      throw new ServiceError(403, 'You do not have permission to access this course.');
  }

  async updateCourse(courseId, user, dto) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertContentEditable(course);
    const updates = dto.toObject();
    await this.resolveCategory(updates, course);
    return CourseDAO.update(courseId, updates);
  }

  async deleteCourse(courseId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    if (course.status === COURSE_STATUS.PENDING_REVIEW)
      throw new ServiceError(409, 'A course pending review cannot be deleted.');
    return CourseDAO.softDelete(courseId);
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
    const updated = await CourseDAO.transitionStatus(course._id, course.status, {
      ...updates,
      status: targetStatus,
    });
    if (!updated)
      throw new ServiceError(
        409,
        'The course status changed while the request was being processed. Please try again.',
      );
    return updated;
  }

  isMetadataComplete(course) {
    return Boolean(course.title?.trim() && course.description?.trim());
  }

  async assertContentComplete(course) {
    if (!this.isMetadataComplete(course)) {
      throw new ServiceError(400, 'Course title and description are required before this action.');
    }
    const validLessonCount = await LessonDAO.countValidByCourseId(course._id);
    if (validLessonCount < 1) {
      throw new ServiceError(
        400,
        'The course must contain at least one lesson with a title and content before this action.',
      );
    }
  }

  async listLessons(courseId, user) {
    await this.getOwnedCourse(courseId, user);
    return LessonDAO.findByCourseId(courseId);
  }

  async createLesson(courseId, user, dto) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertContentEditable(course);
    return LessonDAO.create({ ...dto.toObject(), courseId });
  }

  async updateLesson(courseId, lessonId, user, dto) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertContentEditable(course);
    this.assertValidId(lessonId, 'Lesson');
    const lesson = await LessonDAO.findById(lessonId);
    if (!lesson || String(lesson.courseId) !== String(course._id))
      throw new ServiceError(404, 'Lesson not found.');
    return LessonDAO.update(lessonId, dto.toObject());
  }

  async deleteLesson(courseId, lessonId, user) {
    const course = await this.getOwnedCourse(courseId, user);
    this.assertContentEditable(course);
    this.assertValidId(lessonId, 'Lesson');
    const lesson = await LessonDAO.findById(lessonId);
    if (!lesson || String(lesson.courseId) !== String(course._id))
      throw new ServiceError(404, 'Lesson not found.');
    return LessonDAO.remove(lessonId);
  }

  assertContentEditable(course) {
    if (
      ![COURSE_STATUS.DRAFT, COURSE_STATUS.REJECTED, COURSE_STATUS.APPROVED].includes(course.status)
    ) {
      throw new ServiceError(409, 'Course content cannot be edited in the current course status.');
    }
  }

  async resolveCategory(data, existingCourse = null) {
    if (data.categoryId === undefined) return;
    if (data.categoryId === null) {
      if (!data.category && existingCourse?.categoryId) data.category = null;
      return;
    }
    const category = await CategoryDAO.findActiveById(data.categoryId);
    if (!category) throw new ServiceError(400, 'Selected category does not exist or is inactive.');
    data.category = category.name;
  }
}

module.exports = new CourseService();
