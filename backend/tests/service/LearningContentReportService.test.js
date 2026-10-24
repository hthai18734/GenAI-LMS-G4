const test = require('node:test');
const assert = require('node:assert/strict');
const { learningContentReportService: LearningContentReportService } = require('../../src/composition/services');
const LearningContentReportRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LearningContentReportRepository');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const ServiceError = require('../../src/service/common/ServiceError');

const STUDENT_ID = '507f1f77bcf86cd799439011';
const TEACHER_ID = '507f1f77bcf86cd799439012';
const COURSE_ID = '507f1f77bcf86cd799439013';
const LESSON_ID = '507f1f77bcf86cd799439014';
const REPORT_ID = '507f1f77bcf86cd799439015';

const student = { _id: STUDENT_ID, role: 'student' };
const teacher = { _id: TEACHER_ID, role: 'teacher' };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('reportIssue validates enrollment and creates open report', async () => {
  const origLessonFind = LessonRepository.findById;
  const origEnrollFind = EnrollmentRepository.findAccessibleEnrollment;
  const origCreate = LearningContentReportRepository.create;
  const origFindById = LearningContentReportRepository.findById;

  LessonRepository.findById = async () => ({ _id: LESSON_ID, courseId: COURSE_ID, deletedAt: null });
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
    restore(LearningContentReportRepository, { create: origCreate, findById: origFindById });
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
