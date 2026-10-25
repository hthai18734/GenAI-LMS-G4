const test = require('node:test');
const assert = require('node:assert/strict');
const { assignmentService: AssignmentService } = require('../../src/composition/services');
const AssignmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/AssignmentRepository');
const { courseService: CourseService } = require('../../src/composition/services');
const ServiceError = require('../../src/service/common/ServiceError');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');

const COURSE_ID = '507f1f77bcf86cd799439011';
const TEACHER_ID = '507f1f77bcf86cd799439012';
const teacher = { _id: TEACHER_ID, role: 'teacher' };
const course = { _id: COURSE_ID, teacherId: TEACHER_ID, status: 'DRAFT' };
const dto = { toObject: () => ({ title: 'Analysis report', content: 'Submit your analysis.' }) };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('create assignment derives its course from the owned route context', async () => {
  const courseOriginals = { getOwnedCourse: CourseService.getOwnedCourse, assertContentEditable: CourseService.assertContentEditable };
  const createOriginal = AssignmentRepository.create;
  let created;
  CourseService.getOwnedCourse = async (id, user) => {
    assert.equal(id, COURSE_ID);
    assert.equal(user, teacher);
    return course;
  };
  CourseService.assertContentEditable = (value) => assert.equal(value, course);
  AssignmentRepository.create = async (data) => { created = data; return { _id: '507f1f77bcf86cd799439013', ...data }; };

  try {
    const assignment = await AssignmentService.createAssignment(COURSE_ID, teacher, dto);
    assert.equal(assignment.courseId, COURSE_ID);
    assert.deepEqual(created, { title: 'Analysis report', content: 'Submit your analysis.', courseId: COURSE_ID });
    assert.equal(created.teacherId, undefined);
  } finally {
    restore(CourseService, courseOriginals);
    AssignmentRepository.create = createOriginal;
  }
});

test('create assignment rejects invalid course IDs before a database operation', async () => {
  await assert.rejects(
    AssignmentService.createAssignment('not-an-object-id', teacher, dto),
    (error) => error instanceof ServiceError && error.status === 400 && error.publicMessage === 'Course ID is invalid.',
  );
});

test('list assignments returns assignments only after course ownership is verified', async () => {
  const getOwnedOriginal = CourseService.getOwnedCourse;
  const findOriginal = AssignmentRepository.findByCourseId;
  CourseService.getOwnedCourse = async (id, user) => {
    assert.equal(id, COURSE_ID);
    assert.equal(user, teacher);
    return course;
  };
  AssignmentRepository.findByCourseId = async (id) => {
    assert.equal(id, COURSE_ID);
    return [{ title: 'Saved assignment' }];
  };
  try {
    const assignments = await AssignmentService.listAssignments(COURSE_ID, teacher);
    assert.equal(assignments[0].title, 'Saved assignment');
  } finally {
    CourseService.getOwnedCourse = getOwnedOriginal;
    AssignmentRepository.findByCourseId = findOriginal;
  }
});

test('create assignment preserves course-not-found and ownership authorization failures', async () => {
  const getOwnedOriginal = CourseService.getOwnedCourse;
  const createOriginal = AssignmentRepository.create;
  let persisted = false;
  AssignmentRepository.create = async () => { persisted = true; };
  try {
    CourseService.getOwnedCourse = async () => { throw new ServiceError(404, 'Course not found.'); };
    await assert.rejects(
      AssignmentService.createAssignment(COURSE_ID, teacher, dto),
      (error) => error.status === 404 && error.publicMessage === 'Course not found.',
    );
    CourseService.getOwnedCourse = async () => { throw new ServiceError(403, 'You do not have permission to perform this action.'); };
    await assert.rejects(
      AssignmentService.createAssignment(COURSE_ID, teacher, dto),
      (error) => error.status === 403 && error.publicMessage === 'You do not have permission to perform this action.',
    );
    assert.equal(persisted, false);
  } finally {
    CourseService.getOwnedCourse = getOwnedOriginal;
    AssignmentRepository.create = createOriginal;
  }
});

test('create assignment links only a lesson belonging to the selected course', async () => {
  const lessonId = '507f1f77bcf86cd799439099';
  const linkedDto = { toObject: () => ({ title: 'Practice', content: 'Complete it.', lessonId }) };
  const courseOriginals = { getOwnedCourse: CourseService.getOwnedCourse, assertContentEditable: CourseService.assertContentEditable };
  const findLessonOriginal = LessonRepository.findById;
  const createOriginal = AssignmentRepository.create;
  let created;
  CourseService.getOwnedCourse = async () => course;
  CourseService.assertContentEditable = () => {};
  LessonRepository.findById = async () => ({ _id: lessonId, courseId: COURSE_ID });
  AssignmentRepository.create = async (data) => { created = data; return data; };

  try {
    await AssignmentService.createAssignment(COURSE_ID, teacher, linkedDto);
    assert.equal(created.lessonId, lessonId);
    LessonRepository.findById = async () => ({ _id: lessonId, courseId: '507f1f77bcf86cd799439088' });
    await assert.rejects(
      AssignmentService.createAssignment(COURSE_ID, teacher, linkedDto),
      (error) => error instanceof ServiceError && error.status === 404 && error.publicMessage === 'Lesson not found.',
    );
  } finally {
    restore(CourseService, courseOriginals);
    LessonRepository.findById = findLessonOriginal;
    AssignmentRepository.create = createOriginal;
  }
});

test('update assignment verifies ownership and persists only editable assignment fields', async () => {
  const assignmentId = '507f1f77bcf86cd799439077';
  const assignmentOriginals = { findById: AssignmentRepository.findById, update: AssignmentRepository.update };
  const courseOriginals = { getOwnedCourse: CourseService.getOwnedCourse, assertContentEditable: CourseService.assertContentEditable };
  let updated;
  AssignmentRepository.findById = async (id) => ({ _id: id, courseId: COURSE_ID });
  CourseService.getOwnedCourse = async (id, user) => {
    assert.equal(String(id), COURSE_ID);
    assert.equal(user, teacher);
    return course;
  };
  CourseService.assertContentEditable = (value) => assert.equal(value, course);
  AssignmentRepository.update = async (id, data) => { updated = { id, data }; return { _id: id, ...data }; };

  try {
    const result = await AssignmentService.updateAssignment(assignmentId, teacher, dto);
    assert.equal(result.title, 'Analysis report');
    assert.deepEqual(updated, { id: assignmentId, data: { title: 'Analysis report', content: 'Submit your analysis.' } });
  } finally {
    restore(AssignmentRepository, assignmentOriginals);
    restore(CourseService, courseOriginals);
  }
});
