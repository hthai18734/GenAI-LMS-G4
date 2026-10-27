const test = require('node:test');
const assert = require('node:assert/strict');
const { learningContentReportService: LearningContentReportService } = require('../../src/composition/services');
const LearningContentReportRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LearningContentReportRepository');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const MaterialRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/MaterialRepository');
const ServiceError = require('../../src/service/common/ServiceError');

const STUDENT_ID = '507f1f77bcf86cd799439011';
const TEACHER_ID = '507f1f77bcf86cd799439012';
const COURSE_ID = '507f1f77bcf86cd799439013';
const LESSON_ID = '507f1f77bcf86cd799439014';
const REPORT_ID = '507f1f77bcf86cd799439015';
const MATERIAL_ID = '507f1f77bcf86cd799439016';

const student = { _id: STUDENT_ID, role: 'student' };
const teacher = { _id: TEACHER_ID, role: 'teacher' };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('reportIssue validates enrollment and creates open report', async () => {
  const origLessonFind = LessonRepository.findById;
  const origEnrollFind = EnrollmentRepository.findAccessibleEnrollment;
  const origCourseFind = CourseRepository.findById;
  const origCreate = LearningContentReportRepository.create;
  const origFindById = LearningContentReportRepository.findById;

  LessonRepository.findById = async () => ({ _id: LESSON_ID, courseId: COURSE_ID, isPublished: true, deletedAt: null });
  CourseRepository.findById = async () => ({ _id: COURSE_ID, status: 'PUBLIC', deletedAt: null });
  EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enr1' });
  LearningContentReportRepository.create = async (doc) => ({ _id: REPORT_ID, ...doc });
  LearningContentReportRepository.findById = async () => ({
    _id: REPORT_ID,
    reporterId: { _id: STUDENT_ID, fullName: 'Student A' },
    courseId: { _id: COURSE_ID, title: 'Node Course' },
    lessonId: { _id: LESSON_ID, title: 'Lesson 1' },
    issueType: 'BROKEN_VIDEO',
    description: 'Video cannot play from 03:00',
    status: 'OPEN',
  });

  try {
    const res = await LearningContentReportService.reportIssue(student, {
      lessonId: LESSON_ID,
      issueType: 'BROKEN_VIDEO',
      description: 'Video cannot play from 03:00',
    });

    assert.equal(res.status, 'OPEN');
    assert.equal(res.issueType, 'BROKEN_VIDEO');

    // Reject invalid issue type
    await assert.rejects(
      LearningContentReportService.reportIssue(student, {
        lessonId: LESSON_ID,
        issueType: 'INVALID_TYPE',
        description: 'Some text',
      }),
      (err) => err instanceof ServiceError && err.status === 422,
    );
  } finally {
    restore(LessonRepository, { findById: origLessonFind });
    restore(EnrollmentRepository, { findAccessibleEnrollment: origEnrollFind });
    restore(CourseRepository, { findById: origCourseFind });
    restore(LearningContentReportRepository, { create: origCreate, findById: origFindById });
  }
});

test('reportIssue rejects a material that does not belong to the reported lesson', async () => {
  const originals = {
    lessonFind: LessonRepository.findById,
    materialFind: MaterialRepository.findById,
    enrollmentFind: EnrollmentRepository.findAccessibleEnrollment,
    courseFind: CourseRepository.findById,
    create: LearningContentReportRepository.create,
  };
  let created = false;
  LessonRepository.findById = async () => ({ _id: LESSON_ID, courseId: COURSE_ID, isPublished: true, deletedAt: null });
  CourseRepository.findById = async () => ({ _id: COURSE_ID, status: 'PUBLIC', deletedAt: null });
  MaterialRepository.findById = async () => ({
    _id: MATERIAL_ID,
    lessonId: '507f1f77bcf86cd799439099',
    courseId: COURSE_ID,
    deletedAt: null,
  });
  EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enr1' });
  LearningContentReportRepository.create = async () => { created = true; };

  try {
    await assert.rejects(
      LearningContentReportService.reportIssue(student, {
        lessonId: LESSON_ID,
        materialId: MATERIAL_ID,
        issueType: 'BROKEN_FILE',
        description: 'The file cannot be opened.',
      }),
      (error) => error instanceof ServiceError && error.status === 404,
    );
    assert.equal(created, false);
  } finally {
    restore(LessonRepository, { findById: originals.lessonFind });
    restore(MaterialRepository, { findById: originals.materialFind });
    restore(EnrollmentRepository, { findAccessibleEnrollment: originals.enrollmentFind });
    restore(CourseRepository, { findById: originals.courseFind });
    restore(LearningContentReportRepository, { create: originals.create });
  }
});

test('resolveReport enforces teacher course ownership and resolution note', async () => {
  const origFindById = LearningContentReportRepository.findById;
  const origUpdateStatus = LearningContentReportRepository.updateStatus;

  LearningContentReportRepository.findById = async () => ({
    _id: REPORT_ID,
    courseId: { _id: COURSE_ID, teacherId: TEACHER_ID },
    status: 'OPEN',
  });
  LearningContentReportRepository.updateStatus = async (id, data) => ({
    _id: id,
    status: data.status,
    resolutionNote: data.resolutionNote,
    reporterId: { _id: STUDENT_ID },
    courseId: { _id: COURSE_ID },
    lessonId: { _id: LESSON_ID },
  });

  try {
    const res = await LearningContentReportService.resolveReport(REPORT_ID, teacher, {
      status: 'RESOLVED',
      resolutionNote: 'Fixed the video encoding.',
    });
    assert.equal(res.status, 'RESOLVED');
    assert.equal(res.resolutionNote, 'Fixed the video encoding.');

    // Reject resolving without note
    await assert.rejects(
      LearningContentReportService.resolveReport(REPORT_ID, teacher, {
        status: 'RESOLVED',
        resolutionNote: '   ',
      }),
      (err) => err instanceof ServiceError && err.status === 422,
    );
  } finally {
    restore(LearningContentReportRepository, { findById: origFindById, updateStatus: origUpdateStatus });
  }
});

test('teacher report course filter is intersected with courses owned by that teacher', async () => {
  const FOREIGN_COURSE_ID = '507f1f77bcf86cd799439099';
  const originals = {
    findByTeacherId: CourseRepository.findByTeacherId,
    findByCourses: LearningContentReportRepository.findByCourses,
  };
  const calls = [];

  CourseRepository.findByTeacherId = async () => [{ _id: COURSE_ID }];
  LearningContentReportRepository.findByCourses = async (courseIds, query) => {
    calls.push({ courseIds: courseIds.map(String), query });
    return { items: [], total: 0 };
  };

  try {
    const foreign = await LearningContentReportService.listReportsForTeacher(teacher, {
      courseId: FOREIGN_COURSE_ID,
      page: 1,
      limit: 15,
    });
    assert.deepEqual(foreign.reports, []);
    assert.equal(foreign.pagination.total, 0);
    assert.equal(calls.length, 0, 'foreign course filter must never reach the report repository');

    await LearningContentReportService.listReportsForTeacher(teacher, {
      courseId: COURSE_ID,
      page: 2,
      limit: 10,
    });
    assert.deepEqual(calls[0].courseIds, [COURSE_ID]);
    assert.equal(calls[0].query.courseId, COURSE_ID);
  } finally {
    restore(CourseRepository, { findByTeacherId: originals.findByTeacherId });
    restore(LearningContentReportRepository, { findByCourses: originals.findByCourses });
  }
});
