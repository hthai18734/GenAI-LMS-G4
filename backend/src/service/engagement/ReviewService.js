const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const PaginationUtil = require('../../domain/common/PaginationPolicy');
const ServiceError = require('../common/ServiceError');
const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');

class ReviewService {
  constructor({ reviewRepository, courseRepository, enrollmentRepository } = {}) {
    this.reviewRepository = reviewRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
  }
  async persistence(action) {
    try { return await action(); }
    catch (error) {
      if (error.code === 'REVIEW_DUPLICATE') throw new ServiceError(409, 'You have already reviewed this course. Edit your existing review.');
      if (error.code === 'COURSE_NOT_FOUND') throw new ServiceError(404, 'Course not found.');
      if (error.code === 'REVIEW_NOT_FOUND') throw new ServiceError(404, 'Review not found.');
      throw error;
    }
  }
  assertValidId(id, name) {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${name} ID is invalid.`);
  }
  async getCourse(id) {
    this.assertValidId(id, 'Course');
    const course = await this.courseRepository.findById(id);
    if (!course) throw new ServiceError(404, 'Course not found.');
    return course;
  }
  async getReview(id) {
    this.assertValidId(id, 'Review');
    const review = await this.reviewRepository.findById(id);
    if (!review) throw new ServiceError(404, 'Review not found.');
    return review;
  }
  isCoursePublic(course) {
    if (!course) return false;
    return course.status === COURSE_STATUS.PUBLIC;
  }
  async list(query, user, courseId) {
    const criteria = { search: query.search, status: query.status, courseId: query.courseId };
    if (!user) {
      const course = await this.getCourse(courseId);
      if (!this.isCoursePublic(course)) throw new ServiceError(404, 'Course not found.');
      criteria.courseId = course._id;
      criteria.status = 'visible';
    } else if (user.role === 'student') {
      criteria.userId = user._id;
    } else if (user.role === 'teacher') {
      const courses = await this.courseRepository.findIdsByTeacher(user._id);
      const ids = courses.map((course) => course._id);
      if (criteria.courseId) {
        if (!ids.some((id) => String(id) === String(criteria.courseId))) throw new ServiceError(403, 'You do not have permission to view these reviews.');
      } else criteria.courseIds = ids;
    }
    const [reviews, total] = await Promise.all([this.reviewRepository.findAll(criteria, query), this.reviewRepository.count(criteria)]);
    const { pagination } = PaginationUtil.formatPaginatedResponse(reviews, total, query.page, query.limit);
    return { reviews, pagination };
  }
  async detail(id, user) {
    const review = await this.getReview(id);
    const course = await this.getCourse(review.courseId);
    if (!user && (review.status !== 'visible' || !this.isCoursePublic(course))) throw new ServiceError(404, 'Review not found.');
    if (user?.role === 'student' && String(review.userId) !== String(user._id)) throw new ServiceError(403, 'You do not have permission to view this review.');
    if (user?.role === 'teacher' && String(course.teacherId) !== String(user._id)) throw new ServiceError(403, 'You do not have permission to view this review.');
    return this.reviewRepository.findDetail(id);
  }
  async create(courseId, input, user) {
    if (user.role !== 'student') throw new ServiceError(403, 'Only students can create reviews.');
    const course = await this.getCourse(courseId);
    if (!this.isCoursePublic(course)) throw new ServiceError(404, 'Course not found.');
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, course._id);
    if (!enrollment) throw new ServiceError(403, 'You must be enrolled in this course to review it.');
    const { review } = await this.persistence(() => this.reviewRepository.mutateWithRating(course._id, (session) => this.reviewRepository.create({ ...input, courseId: course._id, userId: user._id }, session), { publicOnly: true }));
    return this.reviewRepository.findDetail(review._id);
  }
  async update(id, input, user) {
    const current = await this.getReview(id);
    if (user.role !== 'student' || String(current.userId) !== String(user._id)) throw new ServiceError(403, 'You can only update your own reviews.');
    await this.persistence(() => this.reviewRepository.mutateWithRating(current.courseId, (session) => this.reviewRepository.update(id, { userId: user._id }, { ...input }, session)));
    return this.reviewRepository.findDetail(id);
  }
  async moderate(id, status, user) {
    if (user.role !== 'admin') throw new ServiceError(403, 'Only admins can moderate reviews.');
    const current = await this.getReview(id);
    await this.persistence(() => this.reviewRepository.mutateWithRating(current.courseId, (session) => this.reviewRepository.update(id, {}, { status, moderatedBy: user._id, moderatedAt: new Date() }, session)));
    return this.reviewRepository.findDetail(id);
  }
  async reply(id, input, user) {
    const review = await this.getReview(id);
    const course = await this.getCourse(review.courseId);
    if (user.role !== 'teacher' || String(course.teacherId) !== String(user._id)) throw new ServiceError(403, 'Only the course teacher can reply to this review.');
    const updated = await this.reviewRepository.update(id, {}, { reply: { ...input, userId: user._id, repliedAt: new Date() } });
    if (!updated) throw new ServiceError(404, 'Review not found.');
    return this.reviewRepository.findDetail(id);
  }
  async remove(id, user) {
    const review = await this.getReview(id);
    if (user.role !== 'admin' && (user.role !== 'student' || String(review.userId) !== String(user._id))) throw new ServiceError(403, 'You can only delete your own reviews.');
    const filter = user.role === 'admin' ? {} : { userId: user._id };
    const { courseId, averageRating } = await this.persistence(() => this.reviewRepository.mutateWithRating(review.courseId, (session) => this.reviewRepository.remove(id, filter, session)));
    return { courseId, averageRating };
  }
}
module.exports = ReviewService;
