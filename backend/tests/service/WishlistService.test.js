const test = require('node:test');
const assert = require('node:assert/strict');
const { wishlistService: WishlistService } = require('../../src/composition/services');
const WishlistRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/WishlistRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const { COURSE_STATUS } = require('../../src/domain/learning/CourseStatus');
const ServiceError = require('../../src/service/common/ServiceError');

const COURSE_ID = '507f1f77bcf86cd799439011';
const STUDENT_ID = '507f1f77bcf86cd799439012';

function restore(target, originals) {
  Object.assign(target, originals);
}

test('addToWishlist adds public course when student is not enrolled', async () => {
  const origCourseFind = CourseRepository.findById;
  const origFindEnrollment = EnrollmentRepository.findActiveEnrollment;
  const origAdd = WishlistRepository.add;

  CourseRepository.findById = async () => ({ _id: COURSE_ID, status: COURSE_STATUS.PUBLIC, deletedAt: null });
  EnrollmentRepository.findActiveEnrollment = async () => null;
  let added = false;
  WishlistRepository.add = async (sId, cId) => {
    assert.equal(sId, STUDENT_ID);
    assert.equal(cId, COURSE_ID);
    added = true;
  };

  try {
    const res = await WishlistService.addToWishlist(STUDENT_ID, COURSE_ID);
    assert.equal(res.saved, true);
    assert.equal(added, true);
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(EnrollmentRepository, { findActiveEnrollment: origFindEnrollment });
    restore(WishlistRepository, { add: origAdd });
  }
});

test('addToWishlist is idempotent if student already enrolled', async () => {
  const origCourseFind = CourseRepository.findById;
  const origFindEnrollment = EnrollmentRepository.findActiveEnrollment;
  const origAdd = WishlistRepository.add;

  CourseRepository.findById = async () => ({ _id: COURSE_ID, status: COURSE_STATUS.PUBLIC, deletedAt: null });
  EnrollmentRepository.findActiveEnrollment = async () => ({ _id: 'enr1' });
  WishlistRepository.add = async () => ({});

  try {
    const res = await WishlistService.addToWishlist(STUDENT_ID, COURSE_ID);
    assert.equal(res.alreadyEnrolled, true);
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(EnrollmentRepository, { findActiveEnrollment: origFindEnrollment });
    restore(WishlistRepository, { add: origAdd });
  }
});

test('removeFromWishlist removes item cleanly', async () => {
  const origRemove = WishlistRepository.remove;
  let removed = false;
  WishlistRepository.remove = async (sId, cId) => {
    assert.equal(sId, STUDENT_ID);
    assert.equal(cId, COURSE_ID);
    removed = true;
  };

  try {
    const res = await WishlistService.removeFromWishlist(STUDENT_ID, COURSE_ID);
    assert.equal(res, true);
    assert.equal(removed, true);
  } finally {
    restore(WishlistRepository, { remove: origRemove });
  }
});
