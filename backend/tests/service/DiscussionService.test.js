const test = require('node:test');
const assert = require('node:assert/strict');
const { discussionService: DiscussionService } = require('../../src/composition/services');
const DiscussionPostRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/DiscussionPostRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const ServiceError = require('../../src/service/common/ServiceError');

const COURSE_ID = '507f1f77bcf86cd799439011';
const STUDENT_ID = '507f1f77bcf86cd799439012';
const POST_ID = '507f1f77bcf86cd799439016';

const student = { _id: STUDENT_ID, role: 'student' };
const activeCourse = { _id: COURSE_ID, teacherId: '507f1f77bcf86cd799439099', deletedAt: null };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('createThread requires enrolled student and non-empty body', async () => {
  const origCourseFind = CourseRepository.findById;
  const origEnrollFind = EnrollmentRepository.findAccessibleEnrollment;
  const origPostCreate = DiscussionPostRepository.create;
  const origPostFind = DiscussionPostRepository.findById;

  CourseRepository.findById = async () => activeCourse;
  EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enr1' });
  DiscussionPostRepository.create = async (doc) => ({ _id: POST_ID, ...doc });
  DiscussionPostRepository.findById = async () => ({
    _id: POST_ID,
    courseId: COURSE_ID,
    authorId: { _id: STUDENT_ID, fullName: 'Student A', role: 'student' },
    title: 'Question about arrays',
    body: 'How does slice differ from splice?',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    const thread = await DiscussionService.createThread(COURSE_ID, student, {
      title: 'Question about arrays',
      body: 'How does slice differ from splice?',
    });

    assert.equal(thread.title, 'Question about arrays');
    assert.equal(thread.body, 'How does slice differ from splice?');

    // Reject empty body
    await assert.rejects(
      DiscussionService.createThread(COURSE_ID, student, { body: '   ' }),
      (err) => err instanceof ServiceError && err.status === 422,
    );
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(EnrollmentRepository, { findAccessibleEnrollment: origEnrollFind });
    restore(DiscussionPostRepository, { create: origPostCreate, findById: origPostFind });
  }
});

test('deletePost applies tombstone when user is author', async () => {
  const origPostFind = DiscussionPostRepository.findById;
  const origSoftDelete = DiscussionPostRepository.softDelete;

  DiscussionPostRepository.findById = async () => ({
    _id: POST_ID,
    authorId: { _id: STUDENT_ID },
    status: 'ACTIVE',
    deletedAt: null,
  });
  let softDeleted = false;
  DiscussionPostRepository.softDelete = async (id) => {
    assert.equal(id, POST_ID);
    softDeleted = true;
  };

  try {
    const res = await DiscussionService.deletePost(POST_ID, student);
    assert.equal(res, true);
    assert.equal(softDeleted, true);
  } finally {
    restore(DiscussionPostRepository, {
      findById: origPostFind,
      softDelete: origSoftDelete,
    });
  }
});

test('updatePost changes only the author own active discussion post', async () => {
  const origPostFind = DiscussionPostRepository.findById;
  const origUpdateBody = DiscussionPostRepository.updateBody;
  let updatedBody = null;

  DiscussionPostRepository.findById = async () => ({
    _id: POST_ID,
    parentId: null,
    authorId: { _id: STUDENT_ID },
    status: 'ACTIVE',
  });
  DiscussionPostRepository.updateBody = async (id, body) => {
    assert.equal(id, POST_ID);
    updatedBody = body;
    return {
      _id: id,
      parentId: null,
      authorId: { _id: STUDENT_ID, fullName: 'Student A', role: 'student' },
      body,
      status: 'ACTIVE',
    };
  };

  try {
    const updated = await DiscussionService.updatePost(POST_ID, student, { body: '  Updated explanation  ' });
    assert.equal(updated.body, 'Updated explanation');
    assert.equal(updatedBody, 'Updated explanation');

    await assert.rejects(
      DiscussionService.updatePost(POST_ID, { _id: '507f1f77bcf86cd799439099' }, { body: 'Not mine' }),
      (error) => error instanceof ServiceError && error.status === 403,
    );
  } finally {
    restore(DiscussionPostRepository, { findById: origPostFind, updateBody: origUpdateBody });
  }
});
