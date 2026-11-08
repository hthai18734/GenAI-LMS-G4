const test = require('node:test');
const assert = require('node:assert/strict');
const ReviewService = require('../../src/service/engagement/ReviewService');
const ServiceError = require('../../src/service/common/ServiceError');

const courseId = '507f1f77bcf86cd799439011';
const student = { _id: '507f1f77bcf86cd799439012', role: 'student' };

function serviceWith(enrollment) {
  return new ReviewService({
    courseRepository: {
      findById: async () => ({ _id: courseId, status: 'PUBLIC' }),
    },
    enrollmentRepository: {
      findAccessibleEnrollment: async () => enrollment,
    },
    reviewRepository: {
      mutateWithRating: async (_id, operation) => ({ review: await operation(null) }),
      create: async (input) => ({ _id: '507f1f77bcf86cd799439013', ...input }),
      findDetail: async () => ({ _id: '507f1f77bcf86cd799439013' }),
    },
  });
}

test('only enrolled students can create a course review', async () => {
  await assert.rejects(
    serviceWith(null).create(courseId, { rating: 5, content: 'Useful course' }, student),
    (error) => error instanceof ServiceError && error.status === 403,
  );

  const review = await serviceWith({ _id: 'enrollment-1' })
    .create(courseId, { rating: 5, content: 'Useful course' }, student);
  assert.ok(review);
});
