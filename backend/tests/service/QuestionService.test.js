const test = require('node:test');
const assert = require('node:assert/strict');
const { questionService: QuestionService } = require('../../src/composition/services');
const QuestionRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/QuestionRepository');
const QuizQuestionRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/QuizQuestionRepository');
const { quizService: QuizService } = require('../../src/composition/services');
const { courseService: CourseService } = require('../../src/composition/services');
const ServiceError = require('../../src/service/common/ServiceError');

const QUIZ_ID = '507f1f77bcf86cd799439011';
const QUESTION_ID = '507f1f77bcf86cd799439012';
const COURSE_ID = '507f1f77bcf86cd799439013';
const teacher = { _id: '507f1f77bcf86cd799439014' };
const course = { _id: COURSE_ID, status: 'DRAFT' };
const question = {
  _id: QUESTION_ID,
  quizId: QUIZ_ID,
  ownerTeacherId: teacher._id,
  questionText: 'What is Node.js?',
  options: ['A framework', 'A runtime'],
  correctAnswer: 'A runtime',
};

function restore(target, originals) { Object.assign(target, originals); }

test('add question verifies quiz access and persists the parent quiz relationship', async () => {
  const quizOriginal = QuizService.getOwnedQuiz;
  const courseOriginal = CourseService.assertContentEditable;
  const createOriginal = QuestionRepository.create;
  const linkOriginal = QuizQuestionRepository.linkQuestion;
  let created = null;
  let linked = null;

  QuizService.getOwnedQuiz = async (id, user, options) => {
    assert.equal(id, QUIZ_ID);
    assert.equal(user, teacher);
    assert.equal(options.includeCourse, true);
    return { quiz: { _id: QUIZ_ID }, course };
  };
  CourseService.assertContentEditable = (value) => assert.equal(value, course);
  QuestionRepository.create = async (data) => { created = data; return { _id: QUESTION_ID, ...data }; };
  QuizQuestionRepository.linkQuestion = async (qId, quesId) => { linked = { qId, quesId }; return {}; };

  try {
    const saved = await QuestionService.createQuestion(QUIZ_ID, teacher, {
      questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer,
    });
    assert.equal(saved.quizId, QUIZ_ID);
    assert.deepEqual(created, {
      quizId: QUIZ_ID,
      categoryId: null,
      ownerTeacherId: teacher._id,
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
    });
    assert.deepEqual(linked, { qId: QUIZ_ID, quesId: QUESTION_ID });
  } finally {
    QuizService.getOwnedQuiz = quizOriginal;
    CourseService.assertContentEditable = courseOriginal;
    QuestionRepository.create = createOriginal;
    QuizQuestionRepository.linkQuestion = linkOriginal;
  }
});

test('update question rejects a correct answer that does not belong to the resulting options', async () => {
  const questionOriginal = QuestionRepository.findById;
  const quizOriginal = QuizService.getOwnedQuiz;
  const courseOriginal = CourseService.assertContentEditable;
  QuestionRepository.findById = async () => question;
  QuizService.getOwnedQuiz = async () => ({ quiz: { _id: QUIZ_ID }, course });
  CourseService.assertContentEditable = () => {};

  try {
    await assert.rejects(
      QuestionService.updateQuestion(QUESTION_ID, teacher, { options: ['One', 'Two'] }),
      (error) => error instanceof ServiceError && error.status === 400 && error.publicMessage === 'Invalid question content.',
    );
  } finally {
    QuestionRepository.findById = questionOriginal;
    QuizService.getOwnedQuiz = quizOriginal;
    CourseService.assertContentEditable = courseOriginal;
  }
});

test('update and delete enforce quiz ownership through the question relationship', async () => {
  const originals = {
    findById: QuestionRepository.findById,
    update: QuestionRepository.update,
    softDelete: QuestionRepository.softDelete,
  };
  const quizOriginal = QuizService.getOwnedQuiz;
  const courseOriginal = CourseService.assertContentEditable;
  const countOriginal = QuizQuestionRepository.countActiveByQuestionId;
  let updateData = null;
  let deletedId = null;

  QuestionRepository.findById = async () => question;
  QuestionRepository.update = async (id, data) => { updateData = { id, data }; return { ...question, ...data }; };
  QuestionRepository.softDelete = async (id) => { deletedId = id; return { ...question, deletedAt: new Date() }; };
  QuizQuestionRepository.countActiveByQuestionId = async () => 0;
  QuizService.getOwnedQuiz = async () => ({ quiz: { _id: QUIZ_ID }, course });
  CourseService.assertContentEditable = () => {};

  try {
    const updated = await QuestionService.updateQuestion(QUESTION_ID, teacher, { correctAnswer: 'A framework' });
    assert.equal(updated.correctAnswer, 'A framework');
    assert.deepEqual(updateData, { id: QUESTION_ID, data: { correctAnswer: 'A framework' } });
    await QuestionService.deleteQuestion(QUESTION_ID, teacher);
    assert.equal(deletedId, QUESTION_ID);
  } finally {
    restore(QuestionRepository, originals);
    QuizService.getOwnedQuiz = quizOriginal;
    CourseService.assertContentEditable = courseOriginal;
    QuizQuestionRepository.countActiveByQuestionId = countOriginal;
  }
});

test('delete question rejects with 409 when question is used in active quizzes', async () => {
  const findOriginal = QuestionRepository.findById;
  const countOriginal = QuizQuestionRepository.countActiveByQuestionId;
  const quizOriginal = QuizService.getOwnedQuiz;
  QuestionRepository.findById = async () => question;
  QuizQuestionRepository.countActiveByQuestionId = async () => 2;
  QuizService.getOwnedQuiz = async () => ({ quiz: { _id: QUIZ_ID }, course });

  try {
    await assert.rejects(
      QuestionService.deleteQuestion(QUESTION_ID, teacher),
      (error) => error instanceof ServiceError && error.status === 409,
    );
  } finally {
    QuestionRepository.findById = findOriginal;
    QuizQuestionRepository.countActiveByQuestionId = countOriginal;
    QuizService.getOwnedQuiz = quizOriginal;
  }
});

test('question lookup returns the SRS message when no active question exists', async () => {
  const original = QuestionRepository.findById;
  QuestionRepository.findById = async () => null;
  try {
    await assert.rejects(
      QuestionService.deleteQuestion(QUESTION_ID, teacher),
      (error) => error instanceof ServiceError && error.status === 404 && error.publicMessage === 'Question not found.',
    );
  } finally {
    QuestionRepository.findById = original;
  }
});

test('createBankQuestion creates standalone question in Bank without QuizQuestion link', async () => {
  const createOriginal = QuestionRepository.create;
  const linkOriginal = QuizQuestionRepository.linkQuestion;
  let created = null;
  let linkCalled = false;

  QuestionRepository.create = async (data) => { created = data; return { _id: QUESTION_ID, ...data }; };
  QuizQuestionRepository.linkQuestion = async () => { linkCalled = true; };

  try {
    const saved = await QuestionService.createBankQuestion(teacher, {
      questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer,
    });

    assert.equal(saved.quizId, null);
    assert.equal(created.quizId, null);
    assert.equal(created.ownerTeacherId, teacher._id);
    assert.equal(linkCalled, false);
  } finally {
    QuestionRepository.create = createOriginal;
    QuizQuestionRepository.linkQuestion = linkOriginal;
  }
});
