const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');
const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');

class EnrollmentLifecycleService {
  constructor({ enrollmentRepository, courseRepository, certificateRepository, progressTrackingService } = {}) {
    this.enrollmentRepository = enrollmentRepository;
    this.courseRepository = courseRepository;
    this.certificateRepository = certificateRepository;
    this.progressTrackingService = progressTrackingService;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  async cancelEnrollment(enrollmentId, user) {
    this.assertValidId(enrollmentId, 'Enrollment ID');
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) throw new ServiceError(404, 'Enrollment not found.');

    if (String(enrollment.userId) !== String(user._id)) {
      throw new ServiceError(403, 'You do not have permission to cancel this enrollment.');
    }

    if (enrollment.status === 'cancelled') {
      return { cancelled: true, message: 'Enrollment is already cancelled.', enrollmentId };
    }

    if (enrollment.status === 'completed') {
      throw new ServiceError(409, 'Cannot cancel a completed course enrollment.');
    }

    const updated = await this.enrollmentRepository.cancelEnrollment(enrollmentId);
    return {
      cancelled: true,
      enrollmentId: String(updated._id),
      status: updated.status,
      cancelledAt: updated.cancelledAt,
    };
  }

  async completeCourse(enrollmentId, user) {
    this.assertValidId(enrollmentId, 'Enrollment ID');
    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) throw new ServiceError(404, 'Enrollment not found.');

    if (String(enrollment.userId) !== String(user._id)) {
      throw new ServiceError(403, 'You do not have permission to complete this enrollment.');
    }

    if (enrollment.status === 'cancelled') {
      throw new ServiceError(400, 'Cannot complete a cancelled enrollment.');
    }

    const courseId = enrollment.courseId._id || enrollment.courseId;
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt || course.status !== COURSE_STATUS.PUBLIC) throw new ServiceError(404, 'Course is not available for completion.');
    const progress = await this.progressTrackingService.recalculateCourseProgress(user._id, courseId);

    if (!progress.eligibleToComplete) {
      throw new ServiceError(422, 'Course requirements are not fully completed yet.', {
        progress: progress.percentage,
        remaining: progress.remainingActivities,
      });
    }

    const alreadyCompleted = enrollment.status === 'completed';
    const updated = alreadyCompleted ? enrollment : await this.enrollmentRepository.markCompleted(enrollmentId);
    const cert = await this.certificateRepository.issueCertificate(user._id, courseId, enrollmentId);

    return {
      completed: true,
      alreadyCompleted,
      enrollmentId: String(updated._id),
      status: 'completed',
      completedAt: updated.completedAt,
      certificateNumber: cert.certificateNumber,
      issuedAt: cert.issuedAt,
    };
  }
}

module.exports = EnrollmentLifecycleService;
