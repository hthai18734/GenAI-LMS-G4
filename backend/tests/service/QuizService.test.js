const test = require('node:test');
const assert = require('node:assert/strict');
const { quizService: QuizService } = require('../../src/composition/services');
const QuizRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/QuizRepository');
const QuizQuestionRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/QuizQuestionRepository');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const { courseService: CourseService } = require('../../src/composition/services');
const ServiceError = require('../../src/service/common/ServiceError');

const COURSE_ID = '507f1f77bcf86cd799439011';
const LESSON_ID = '507f1f77bcf86cd799439012';
const QUIZ_ID = '507f1f77bcf86cd799439013';
const teacher = { _id: '507f1f77bcf86cd799439014' };
const course = { _id: COURSE_ID, teacherId: teacher._id, status: 'DRAFT' };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('create quiz derives course ownership from the authenticated teacher and verifies the lesson relationship', async () => {
  const courseOriginals = { getOwnedCourse: CourseService.getOwnedCourse, assertContentEditable: CourseService.assertContentEditable };
  const lessonOriginal = LessonRepository.findById;
  const quizOriginal = QuizRepository.create;
  let created = null;

  CourseService.getOwnedCourse = async (id, user) => {
    assert.equal(id, COURSE_ID);
    assert.equal(user, teacher);
    return course;
  };
  CourseService.assertContentEditable = (value) => assert.equal(value, course);
  LessonRepository.findById = async (id) => ({ _id: id, courseId: COURSE_ID });
  QuizRepository.create = async (data) => { created = data; return { _id: QUIZ_ID, ...data }; };

  try {
    const quiz = await QuizService.createQuiz(COURSE_ID, teacher, {
      toObject: () => ({ title: 'Quiz', lessonId: LESSON_ID, timeLimit: 10, passingScore: 60, attemptLimit: 2 }),
    });
    assert.equal(quiz.courseId, COURSE_ID);
    assert.deepEqual(created, {
      title: 'Quiz', lessonId: LESSON_ID, timeLimit: 10, passingScore: 60, attemptLimit: 2, courseId: COURSE_ID,
    });
    assert.equal(created.teacherId, undefined);
  } finally {
    restore(CourseService, courseOriginals);
    LessonRepository.findById = lessonOriginal;
    QuizRepository.create = quizOriginal;
  }
});

test('create quiz rejects a lesson that belongs to another course', async () => {
  const courseOriginals = { getOwnedCourse: CourseService.getOwnedCourse, assertContentEditable: CourseService.assertContentEditable };
  const lessonOriginal = LessonRepository.findById;

  CourseService.getOwnedCourse = async () => course;
  CourseService.assertContentEditable = () => {};
  LessonRepository.findById = async () => ({ _id: LESSON_ID, courseId: '507f1f77bcf86cd799439099' });

  try {
    await assert.rejects(
      QuizService.createQuiz(COURSE_ID, teacher, { toObject: () => ({ title: 'Quiz', lessonId: LESSON_ID, timeLimit: 10, passingScore: 60 }) }),
      (error) => error instanceof ServiceError && error.status === 404 && error.publicMessage === 'Lesson not found.',
    );
  } finally {
    restore(CourseService, courseOriginals);
    LessonRepository.findById = lessonOriginal;
  }
});

test('list quizzes returns saved quizzes only after course ownership is verified', async () => {
  const courseOriginal = CourseService.getOwnedCourse;
  const listOriginal = QuizRepository.findByCourseId;
  CourseService.getOwnedCourse = async (id, user) => {
    assert.equal(id, COURSE_ID);
    assert.equal(user, teacher);
    return course;
  };
  QuizRepository.findByCourseId = async (id) => {
    assert.equal(id, COURSE_ID);
    return [{ _id: QUIZ_ID, title: 'Saved quiz' }];
  };
  try {
    const quizzes = await QuizService.listQuizzes(COURSE_ID, teacher);
    assert.equal(quizzes[0].title, 'Saved quiz');
  } finally {
    CourseService.getOwnedCourse = courseOriginal;
    QuizRepository.findByCourseId = listOriginal;
  }
});

test('viewing a quiz enforces ownership through its course', async () => {
  const quizOriginal = QuizRepository.findById;
  const courseOriginal = CourseService.getOwnedCourse;
  QuizRepository.findById = async () => ({ _id: QUIZ_ID, courseId: COURSE_ID });
  CourseService.getOwnedCourse = async () => { throw new ServiceError(403, 'You do not have permission to access this course.'); };

  try {
    await assert.rejects(
      QuizService.getQuiz(QUIZ_ID, teacher),
      (error) => error instanceof ServiceError && error.status === 403,
    );
  } finally {
    QuizRepository.findById = quizOriginal;
    CourseService.getOwnedCourse = courseOriginal;
  }
});

test('update and delete persist only after owned quiz and editable course checks', async () => {
  const quizOriginals = { findById: QuizRepository.findById, update: QuizRepository.update, softDelete: QuizRepository.softDelete };
  const courseOriginals = { getOwnedCourse: CourseService.getOwnedCourse, assertContentEditable: CourseService.assertContentEditable };
  const deleteQQOriginal = QuizQuestionRepository.deleteByQuizId;
  let updateData = null;
  let deletedId = null;

  QuizRepository.findById = async () => ({ _id: QUIZ_ID, courseId: COURSE_ID, lessonId: LESSON_ID });
  QuizRepository.update = async (id, data) => { updateData = { id, data }; return { _id: id, ...data }; };
  QuizRepository.softDelete = async (id) => { deletedId = id; return { _id: id, deletedAt: new Date() }; };
  QuizQuestionRepository.deleteByQuizId = async () => ({ deletedCount: 0 });
  CourseService.getOwnedCourse = async () => course;
  CourseService.assertContentEditable = () => {};

  try {
    const updated = await QuizService.updateQuiz(QUIZ_ID, teacher, { toObject: () => ({ timeLimit: 25, attemptLimit: 3 }) });
    assert.equal(updated.timeLimit, 25);
    assert.deepEqual(updateData, { id: QUIZ_ID, data: { timeLimit: 25, attemptLimit: 3 } });
    await QuizService.deleteQuiz(QUIZ_ID, teacher);
    assert.equal(deletedId, QUIZ_ID);
  } finally {
    restore(QuizRepository, quizOriginals);
    restore(CourseService, courseOriginals);
    QuizQuestionRepository.deleteByQuizId = deleteQQOriginal;
  }
});
