const test = require('node:test');
const assert = require('node:assert/strict');
const CourseService = require('../../src/service/learning/CourseService');
const CourseModerationService = require('../../src/service/admin/CourseModerationService');
const CourseDAO = require('../../src/dao/learning/CourseDAO');
const LessonDAO = require('../../src/dao/learning/LessonDAO');
const NotificationDAO = require('../../src/dao/engagement/NotificationDAO');
const {
  COURSE_STATUS,
  COURSE_STATUSES,
  canTransition,
} = require('../../src/model/learning/CourseStatus');

const courseId = '507f1f77bcf86cd799439011';
const teacherId = '507f1f77bcf86cd799439012';
const adminId = '507f1f77bcf86cd799439013';

function course(status, overrides = {}) {
  return {
    _id: courseId,
    teacherId,
    title: 'Lifecycle Course',
    description: 'Complete description',
    status,
    ...overrides,
  };
}

test('course status definition contains exactly the required statuses and transitions', () => {
  assert.deepEqual(
    [...COURSE_STATUSES],
    ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLIC', 'ARCHIVED'],
  );
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
    findById: CourseDAO.findById,
    transitionStatus: CourseDAO.transitionStatus,
    countValidByCourseId: LessonDAO.countValidByCourseId,
  };
  let transition = null;
  CourseDAO.findById = async () =>
    course(COURSE_STATUS.REJECTED, {
      rejectionReason: 'Old reason',
      moderatedBy: adminId,
      moderatedAt: new Date(),
    });
  LessonDAO.countValidByCourseId = async () => 1;
  CourseDAO.transitionStatus = async (id, fromStatus, updates) => {
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
    Object.assign(CourseDAO, {
      findById: originals.findById,
      transitionStatus: originals.transitionStatus,
    });
    LessonDAO.countValidByCourseId = originals.countValidByCourseId;
  }
});

test('incomplete course remains unchanged when submitted or published', async () => {
  const originals = {
    findById: CourseDAO.findById,
    transitionStatus: CourseDAO.transitionStatus,
    countValidByCourseId: LessonDAO.countValidByCourseId,
  };
  let transitions = 0;
  LessonDAO.countValidByCourseId = async () => 0;
  CourseDAO.transitionStatus = async () => {
    transitions += 1;
  };

  try {
    CourseDAO.findById = async () => course(COURSE_STATUS.DRAFT);
    await assert.rejects(
      CourseService.submitForReview(courseId, { _id: teacherId }),
      /at least one lesson/,
    );
    CourseDAO.findById = async () => course(COURSE_STATUS.APPROVED);
    await assert.rejects(
      CourseService.publishCourse(courseId, { _id: teacherId }),
      /at least one lesson/,
    );
    assert.equal(transitions, 0);
  } finally {
    Object.assign(CourseDAO, {
      findById: originals.findById,
      transitionStatus: originals.transitionStatus,
    });
    LessonDAO.countValidByCourseId = originals.countValidByCourseId;
  }
});

test('teacher publishes APPROVED and unpublishes PUBLIC back to APPROVED', async () => {
  const originals = {
    findById: CourseDAO.findById,
    transitionStatus: CourseDAO.transitionStatus,
    countValidByCourseId: LessonDAO.countValidByCourseId,
  };
  let current = course(COURSE_STATUS.APPROVED);
  CourseDAO.findById = async () => current;
  LessonDAO.countValidByCourseId = async () => 1;
  CourseDAO.transitionStatus = async (id, fromStatus, updates) => {
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
    Object.assign(CourseDAO, {
      findById: originals.findById,
      transitionStatus: originals.transitionStatus,
    });
    LessonDAO.countValidByCourseId = originals.countValidByCourseId;
  }
});

test('admin approval stops at APPROVED and rejection records moderation fields', async () => {
  const originals = {
    findByIdForModeration: CourseDAO.findByIdForModeration,
    transitionStatus: CourseDAO.transitionStatus,
    createNotification: NotificationDAO.create,
  };
  let current = course(COURSE_STATUS.PENDING_REVIEW);
  CourseDAO.findByIdForModeration = async () => current;
  CourseDAO.transitionStatus = async (id, fromStatus, updates) => {
    current = { ...current, ...updates };
    return current;
  };
  NotificationDAO.create = async () => ({});

  try {
    const approved = await CourseModerationService.approveCourse(courseId, { _id: adminId });
    assert.equal(approved.status, COURSE_STATUS.APPROVED);
    assert.equal(approved.moderatedBy, adminId);
    assert.equal(approved.rejectionReason, null);

    current = course(COURSE_STATUS.PENDING_REVIEW);
    const rejected = await CourseModerationService.rejectCourse(
      courseId,
      { _id: adminId },
      { toObject: () => ({ reason: 'Add more examples.' }) },
    );
    assert.equal(rejected.status, COURSE_STATUS.REJECTED);
    assert.equal(rejected.rejectionReason, 'Add more examples.');
    assert.equal(rejected.moderatedBy, adminId);
    assert.ok(rejected.moderatedAt instanceof Date);
  } finally {
    CourseDAO.findByIdForModeration = originals.findByIdForModeration;
    CourseDAO.transitionStatus = originals.transitionStatus;
    NotificationDAO.create = originals.createNotification;
  }
});
