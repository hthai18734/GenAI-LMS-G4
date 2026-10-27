const test = require('node:test');
const assert = require('node:assert/strict');
const { courseService: CourseService } = require('../../src/composition/services');
const { courseModerationService: CourseModerationService } = require('../../src/composition/services');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const NotificationRepository = require('../../src/infrastructure/persistence/mongoose/repositories/engagement/NotificationRepository');
const { COURSE_STATUS, COURSE_STATUSES, canTransition } = require('../../src/domain/learning/CourseStatus');

const courseId = '507f1f77bcf86cd799439011';
const teacherId = '507f1f77bcf86cd799439012';
const adminId = '507f1f77bcf86cd799439013';

function course(status, overrides = {}) {
  return { _id: courseId, teacherId, title: 'Lifecycle Course', description: 'Complete description', status, ...overrides };
}

test('course status definition contains exactly the required statuses and transitions', () => {
  assert.deepEqual([...COURSE_STATUSES], ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLIC', 'ARCHIVED']);
  assert.equal(canTransition(COURSE_STATUS.DRAFT, COURSE_STATUS.PENDING_REVIEW), true);
  assert.equal(canTransition(COURSE_STATUS.REJECTED, COURSE_STATUS.PENDING_REVIEW), true);
  assert.equal(canTransition(COURSE_STATUS.PENDING_REVIEW, COURSE_STATUS.APPROVED), true);
  assert.equal(canTransition(COURSE_STATUS.APPROVED, COURSE_STATUS.PUBLIC), true);
  assert.equal(canTransition(COURSE_STATUS.PUBLIC, COURSE_STATUS.APPROVED), true);
  assert.equal(canTransition(COURSE_STATUS.DRAFT, COURSE_STATUS.PUBLIC), false);
  assert.equal(canTransition(COURSE_STATUS.PENDING_REVIEW, COURSE_STATUS.DRAFT), false);
  assert.equal(canTransition(COURSE_STATUS.PUBLIC, COURSE_STATUS.REJECTED), false);
});

test('teacher submission validates content and clears stale moderation data atomically', async () => {
  const originals = {
    findById: CourseRepository.findById,
    transitionStatus: CourseRepository.transitionStatus,
    countValidByCourseId: LessonRepository.countValidByCourseId,
  };
  let transition = null;
  CourseRepository.findById = async () => course(COURSE_STATUS.REJECTED, { rejectionReason: 'Old reason', moderatedBy: adminId, moderatedAt: new Date() });
  LessonRepository.countValidByCourseId = async () => 1;
  CourseRepository.transitionStatus = async (id, fromStatus, updates) => {
    transition = { id, fromStatus, updates };
    return { ...course(updates.status), ...updates };
  };

  try {
    const updated = await CourseService.submitForReview(courseId, { _id: teacherId });
    assert.equal(updated.status, COURSE_STATUS.PENDING_REVIEW);
    assert.equal(transition.fromStatus, COURSE_STATUS.REJECTED);
    assert.equal(transition.updates.rejectionReason, null);
    assert.equal(transition.updates.moderatedBy, null);
    assert.equal(transition.updates.moderatedAt, null);
    assert.ok(transition.updates.submittedForReviewAt instanceof Date);
  } finally {
    Object.assign(CourseRepository, { findById: originals.findById, transitionStatus: originals.transitionStatus });
    LessonRepository.countValidByCourseId = originals.countValidByCourseId;
  }
});

test('incomplete course remains unchanged when submitted or published', async () => {
  const originals = {
    findById: CourseRepository.findById,
    transitionStatus: CourseRepository.transitionStatus,
    countValidByCourseId: LessonRepository.countValidByCourseId,
  };
  let transitions = 0;
  LessonRepository.countValidByCourseId = async () => 0;
  CourseRepository.transitionStatus = async () => { transitions += 1; };

  try {
    CourseRepository.findById = async () => course(COURSE_STATUS.DRAFT);
    await assert.rejects(
      CourseService.submitForReview(courseId, { _id: teacherId }),
      /at least one lesson/
    );
    CourseRepository.findById = async () => course(COURSE_STATUS.APPROVED);
    await assert.rejects(
      CourseService.publishCourse(courseId, { _id: teacherId }),
      /at least one lesson/
    );
    assert.equal(transitions, 0);
  } finally {
    Object.assign(CourseRepository, { findById: originals.findById, transitionStatus: originals.transitionStatus });
    LessonRepository.countValidByCourseId = originals.countValidByCourseId;
  }
});

test('teacher publishes APPROVED and unpublishes PUBLIC back to APPROVED', async () => {
  const originals = {
    findById: CourseRepository.findById,
    transitionStatus: CourseRepository.transitionStatus,
    countValidByCourseId: LessonRepository.countValidByCourseId,
  };
  let current = course(COURSE_STATUS.APPROVED);
  CourseRepository.findById = async () => current;
  LessonRepository.countValidByCourseId = async () => 1;
  CourseRepository.transitionStatus = async (id, fromStatus, updates) => {
    assert.equal(fromStatus, current.status);
    current = { ...current, ...updates };
    return current;
  };

  try {
    const published = await CourseService.publishCourse(courseId, { _id: teacherId });
    assert.equal(published.status, COURSE_STATUS.PUBLIC);
    const unpublished = await CourseService.unpublishCourse(courseId, { _id: teacherId });
    assert.equal(unpublished.status, COURSE_STATUS.APPROVED);
  } finally {
    Object.assign(CourseRepository, { findById: originals.findById, transitionStatus: originals.transitionStatus });
    LessonRepository.countValidByCourseId = originals.countValidByCourseId;
  }
});

test('admin approval stops at APPROVED and rejection records moderation fields', async () => {
  const originals = {
    findByIdForModeration: CourseRepository.findByIdForModeration,
    transitionStatus: CourseRepository.transitionStatus,
    createNotification: NotificationRepository.create,
  };
  let current = course(COURSE_STATUS.PENDING_REVIEW);
  CourseRepository.findByIdForModeration = async () => current;
  CourseRepository.transitionStatus = async (id, fromStatus, updates) => {
    current = { ...current, ...updates };
    return current;
  };
  NotificationRepository.create = async () => ({});

  try {
    const approved = await CourseModerationService.approveCourse(courseId, { _id: adminId });
    assert.equal(approved.status, COURSE_STATUS.APPROVED);
    assert.equal(approved.moderatedBy, adminId);
    assert.equal(approved.rejectionReason, null);

    current = course(COURSE_STATUS.PENDING_REVIEW);
    const rejected = await CourseModerationService.rejectCourse(courseId, { _id: adminId }, { reason: 'Add more examples.' });
    assert.equal(rejected.status, COURSE_STATUS.REJECTED);
    assert.equal(rejected.rejectionReason, 'Add more examples.');
    assert.equal(rejected.moderatedBy, adminId);
    assert.ok(rejected.moderatedAt instanceof Date);
  } finally {
    CourseRepository.findByIdForModeration = originals.findByIdForModeration;
    CourseRepository.transitionStatus = originals.transitionStatus;
    NotificationRepository.create = originals.createNotification;
  }
});
