const test = require('node:test');
const assert = require('node:assert/strict');
const { lessonManagementService: LessonManagementService } = require('../../src/composition/services');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const ServiceError = require('../../src/service/common/ServiceError');

const COURSE_ID = '507f1f77bcf86cd799439011';
const TEACHER_ID = '507f1f77bcf86cd799439012';
const LESSON_ID_1 = '507f1f77bcf86cd799439013';
const LESSON_ID_2 = '507f1f77bcf86cd799439014';

const teacher = { _id: TEACHER_ID, role: 'teacher' };
const activeCourse = { _id: COURSE_ID, teacherId: TEACHER_ID, status: 'DRAFT', deletedAt: null };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('createLesson validates title and auto assigns next order', async () => {
  const origCourseFind = CourseRepository.findById;
  const origMaxOrder = LessonRepository.maxActiveOrder;
  const origCreate = LessonRepository.create;

  CourseRepository.findById = async () => activeCourse;
  LessonRepository.maxActiveOrder = async () => 3;
  let createdData;
  LessonRepository.create = async (data) => {
    createdData = data;
    return { _id: LESSON_ID_1, ...data };
  };

  try {
    const result = await LessonManagementService.createLesson(COURSE_ID, teacher, {
      title: 'Introduction to Node.js',
      content: 'Sample content',
      videoRef: 'https://youtube.com/watch?v=123',
    });

    assert.equal(result.title, 'Introduction to Node.js');
    assert.equal(createdData.order, 4);
    assert.equal(createdData.isPublished, false);
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(LessonRepository, { maxActiveOrder: origMaxOrder, create: origCreate });
  }
});

test('createLesson rejects empty or overly long title', async () => {
  const origCourseFind = CourseRepository.findById;
  CourseRepository.findById = async () => activeCourse;

  try {
    await assert.rejects(
      LessonManagementService.createLesson(COURSE_ID, teacher, { title: '   ' }),
      (err) => err instanceof ServiceError && err.status === 422,
    );
    await assert.rejects(
      LessonManagementService.createLesson(COURSE_ID, teacher, { title: 'a'.repeat(201) }),
      (err) => err instanceof ServiceError && err.status === 422,
    );
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
  }
});

test('deleteLesson performs soft delete and normalizes remaining lesson orders', async () => {
  const origCourseFind = CourseRepository.findById;
  const origLessonFind = LessonRepository.findById;
  const origSoftDelete = LessonRepository.softDelete;
  const origNormalize = LessonRepository.normalizeOrder;

  CourseRepository.findById = async () => activeCourse;
  LessonRepository.findById = async () => ({ _id: LESSON_ID_1, courseId: COURSE_ID, deletedAt: null });
  let softDeletedId;
  let normalizedCourseId;
  LessonRepository.softDelete = async (id) => { softDeletedId = id; };
  LessonRepository.normalizeOrder = async (cid) => { normalizedCourseId = cid; };

  try {
    const ok = await LessonManagementService.deleteLesson(LESSON_ID_1, teacher);
    assert.equal(ok, true);
    assert.equal(String(softDeletedId), LESSON_ID_1);
    assert.equal(String(normalizedCourseId), COURSE_ID);
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(LessonRepository, { findById: origLessonFind, softDelete: origSoftDelete, normalizeOrder: origNormalize });
  }
});

test('reorderLessons enforces strict membership and updates lesson orders', async () => {
  const origCourseFind = CourseRepository.findById;
  const origFindByCourse = LessonRepository.findByCourseId;
  const origReorder = LessonRepository.reorderLessons;

  CourseRepository.findById = async () => activeCourse;
  LessonRepository.findByCourseId = async () => [
    { _id: LESSON_ID_1, order: 1 },
    { _id: LESSON_ID_2, order: 2 },
  ];
  let persistedOrder;
  LessonRepository.reorderLessons = async (cid, list) => {
    persistedOrder = list;
    return [{ _id: LESSON_ID_2, order: 1 }, { _id: LESSON_ID_1, order: 2 }];
  };

  try {
    // Reorder with swap [LESSON_ID_2, LESSON_ID_1]
    const updated = await LessonManagementService.reorderLessons(COURSE_ID, teacher, [LESSON_ID_2, LESSON_ID_1]);
    assert.deepEqual(persistedOrder, [LESSON_ID_2, LESSON_ID_1]);
    assert.equal(updated.length, 2);

    // Mismatched list rejected with 409
    await assert.rejects(
      LessonManagementService.reorderLessons(COURSE_ID, teacher, [LESSON_ID_1, '507f1f77bcf86cd799439999']),
      (err) => err instanceof ServiceError && err.status === 409,
    );
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(LessonRepository, { findByCourseId: origFindByCourse, reorderLessons: origReorder });
  }
});

test('lesson write operations all reject a course whose content is not editable', async () => {
  const origCourseFind = CourseRepository.findById;
  const origLessonFind = LessonRepository.findById;
  const origMaxOrder = LessonRepository.maxActiveOrder;
  const origCreate = LessonRepository.create;
  const origFindByCourse = LessonRepository.findByCourseId;
  const origReorder = LessonRepository.reorderLessons;
  const origUpdate = LessonRepository.update;
  const origSoftDelete = LessonRepository.softDelete;

  CourseRepository.findById = async () => ({ ...activeCourse, status: 'PENDING_REVIEW' });
  LessonRepository.findById = async () => ({ _id: LESSON_ID_1, courseId: COURSE_ID, deletedAt: null });
  let writes = 0;
  LessonRepository.maxActiveOrder = async () => 0;
  LessonRepository.create = async () => { writes += 1; };
  LessonRepository.findByCourseId = async () => [
    { _id: LESSON_ID_1, order: 1 },
    { _id: LESSON_ID_2, order: 2 },
  ];
  LessonRepository.reorderLessons = async () => { writes += 1; };
  LessonRepository.update = async () => { writes += 1; };
  LessonRepository.softDelete = async () => { writes += 1; };

  const isLockedCourseError = (error) => error instanceof ServiceError
    && error.status === 409
    && /cannot be edited/i.test(error.publicMessage);

  try {
    await assert.rejects(
      LessonManagementService.createLesson(COURSE_ID, teacher, { title: 'Locked lesson' }),
      isLockedCourseError,
    );
    await assert.rejects(
      LessonManagementService.updateLesson(LESSON_ID_1, teacher, { title: 'Locked update' }),
      isLockedCourseError,
    );
    await assert.rejects(
      LessonManagementService.deleteLesson(LESSON_ID_1, teacher),
      isLockedCourseError,
    );
    await assert.rejects(
      LessonManagementService.reorderLessons(COURSE_ID, teacher, [LESSON_ID_2, LESSON_ID_1]),
      isLockedCourseError,
    );
    assert.equal(writes, 0);
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(LessonRepository, {
      findById: origLessonFind,
      maxActiveOrder: origMaxOrder,
      create: origCreate,
      findByCourseId: origFindByCourse,
      reorderLessons: origReorder,
      update: origUpdate,
      softDelete: origSoftDelete,
    });
  }
});

test('create and update reject string boolean publication values', async () => {
  const origCourseFind = CourseRepository.findById;
  const origLessonFind = LessonRepository.findById;
  const origMaxOrder = LessonRepository.maxActiveOrder;
  const origCreate = LessonRepository.create;
  const origUpdate = LessonRepository.update;

  CourseRepository.findById = async () => activeCourse;
  LessonRepository.findById = async () => ({ _id: LESSON_ID_1, courseId: COURSE_ID, deletedAt: null });
  LessonRepository.maxActiveOrder = async () => 0;
  let writes = 0;
  LessonRepository.create = async () => { writes += 1; };
  LessonRepository.update = async () => { writes += 1; };

  const isBooleanValidationError = (error) => error instanceof ServiceError
    && error.status === 422
    && /boolean/i.test(error.publicMessage);

  try {
    await assert.rejects(
      LessonManagementService.createLesson(COURSE_ID, teacher, { title: 'Lesson', isPublished: 'false' }),
      isBooleanValidationError,
    );
    await assert.rejects(
      LessonManagementService.updateLesson(LESSON_ID_1, teacher, { isPublished: 'false' }),
      isBooleanValidationError,
    );
    assert.equal(writes, 0);
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(LessonRepository, {
      findById: origLessonFind,
      maxActiveOrder: origMaxOrder,
      create: origCreate,
      update: origUpdate,
    });
  }
});
