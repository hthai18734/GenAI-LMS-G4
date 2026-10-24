const test = require('node:test');
const assert = require('node:assert/strict');
const { materialService: MaterialService } = require('../../src/composition/services');
const MaterialRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/MaterialRepository');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const ServiceError = require('../../src/service/common/ServiceError');

const COURSE_ID = '507f1f77bcf86cd799439011';
const TEACHER_ID = '507f1f77bcf86cd799439012';
const LESSON_ID = '507f1f77bcf86cd799439013';
const MATERIAL_ID = '507f1f77bcf86cd799439015';

const teacher = { _id: TEACHER_ID, role: 'teacher' };
const activeCourse = { _id: COURSE_ID, teacherId: TEACHER_ID, deletedAt: null };
const activeLesson = { _id: LESSON_ID, courseId: COURSE_ID, deletedAt: null, isPublished: true };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('uploadMaterial persists file record and returns safe DTO', async () => {
  const origLessonFind = LessonRepository.findById;
  const origCourseFind = CourseRepository.findById;
  const origCreate = MaterialRepository.create;

  LessonRepository.findById = async () => activeLesson;
  CourseRepository.findById = async () => activeCourse;
  MaterialRepository.create = async (doc) => ({
    _id: MATERIAL_ID,
    ...doc,
    createdAt: new Date(),
  });

  const dummyFile = {
    filename: 'mat-12345.pdf',
    originalname: 'Slides.pdf',
    path: 'uploads/materials/mat-12345.pdf',
    mimetype: 'application/pdf',
    size: 1024,
  };

  try {
    const result = await MaterialService.uploadMaterial(LESSON_ID, teacher, dummyFile, {
      name: 'Custom Slides',
      description: 'Course slides',
    });

    assert.equal(result.name, 'Custom Slides');
    assert.equal(result.mimeType, 'application/pdf');
    assert.equal(result.filePath, undefined); // File system path should NOT leak
    assert.equal(result.storageKey, undefined);
  } finally {
    restore(LessonRepository, { findById: origLessonFind });
    restore(CourseRepository, { findById: origCourseFind });
    restore(MaterialRepository, { create: origCreate });
  }
});

test('uploadMaterial rejects missing file payload', async () => {
  await assert.rejects(
    MaterialService.uploadMaterial(LESSON_ID, teacher, null),
    (err) => err instanceof ServiceError && err.status === 422,
  );
});
