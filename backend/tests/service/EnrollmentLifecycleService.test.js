const test = require('node:test');
const assert = require('node:assert/strict');
const { enrollmentLifecycleService: EnrollmentLifecycleService } = require('../../src/composition/services');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const CertificateRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CertificateRepository');
const { progressTrackingService: ProgressTrackingService } = require('../../src/composition/services');
const ServiceError = require('../../src/service/common/ServiceError');

const STUDENT_ID = '507f1f77bcf86cd799439011';
const COURSE_ID = '507f1f77bcf86cd799439012';
const ENROLLMENT_ID = '507f1f77bcf86cd799439013';

const student = { _id: STUDENT_ID, role: 'student' };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('cancelEnrollment cancels active enrollment cleanly', async () => {
  const origFind = EnrollmentRepository.findById;
  const origCancel = EnrollmentRepository.cancelEnrollment;

  EnrollmentRepository.findById = async () => ({
    _id: ENROLLMENT_ID,
    userId: STUDENT_ID,
    courseId: COURSE_ID,
    status: 'active',
  });
  EnrollmentRepository.cancelEnrollment = async () => ({
    _id: ENROLLMENT_ID,
    status: 'cancelled',
    cancelledAt: new Date(),
  });

  try {
    const res = await EnrollmentLifecycleService.cancelEnrollment(ENROLLMENT_ID, student);
    assert.equal(res.cancelled, true);
    assert.equal(res.status, 'cancelled');
  } finally {
    restore(EnrollmentRepository, { findById: origFind, cancelEnrollment: origCancel });
  }
});

test('cancelEnrollment rejects completed enrollment with 409', async () => {
  const origFind = EnrollmentRepository.findById;
  EnrollmentRepository.findById = async () => ({
    _id: ENROLLMENT_ID,
    userId: STUDENT_ID,
    courseId: COURSE_ID,
    status: 'completed',
  });

  try {
    await assert.rejects(
      EnrollmentLifecycleService.cancelEnrollment(ENROLLMENT_ID, student),
      (err) => err instanceof ServiceError && err.status === 409,
    );
  } finally {
    restore(EnrollmentRepository, { findById: origFind });
  }
});

test('completeCourse validates eligibility and issues certificate', async () => {
  const origFind = EnrollmentRepository.findById;
  const origMarkCompleted = EnrollmentRepository.markCompleted;
  const origIssueCert = CertificateRepository.issueCertificate;
  const origRecalc = ProgressTrackingService.recalculateCourseProgress;

  EnrollmentRepository.findById = async () => ({
    _id: ENROLLMENT_ID,
    userId: STUDENT_ID,
    courseId: { _id: COURSE_ID },
    status: 'active',
  });
  ProgressTrackingService.recalculateCourseProgress = async () => ({
    percentage: 100,
    eligibleToComplete: true,
  });
  EnrollmentRepository.markCompleted = async () => ({
    _id: ENROLLMENT_ID,
    status: 'completed',
    completedAt: new Date(),
  });
  CertificateRepository.issueCertificate = async () => ({
    certificateNumber: 'CERT-123456',
    issuedAt: new Date(),
  });

  try {
    const res = await EnrollmentLifecycleService.completeCourse(ENROLLMENT_ID, student);
    assert.equal(res.completed, true);
    assert.equal(res.certificateNumber, 'CERT-123456');

    // Ineligible progress rejected with 422
    ProgressTrackingService.recalculateCourseProgress = async () => ({
      percentage: 80,
      eligibleToComplete: false,
    });
    await assert.rejects(
      EnrollmentLifecycleService.completeCourse(ENROLLMENT_ID, student),
      (err) => err instanceof ServiceError && err.status === 422,
    );
  } finally {
    restore(EnrollmentRepository, { findById: origFind, markCompleted: origMarkCompleted });
    restore(CertificateRepository, { issueCertificate: origIssueCert });
    ProgressTrackingService.recalculateCourseProgress = origRecalc;
  }
});
