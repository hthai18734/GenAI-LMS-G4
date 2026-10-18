const mongoose = require('mongoose');
const QuizDAO = require('../../dao/learning/QuizDAO');
const LessonDAO = require('../../dao/learning/LessonDAO');
const QuestionDAO = require('../../dao/learning/QuestionDAO');
const QuizAttemptDAO = require('../../dao/learning/QuizAttemptDAO');
const EnrollmentDAO = require('../../dao/learning/EnrollmentDAO');
const ProgressDAO = require('../../dao/learning/ProgressDAO');
const CourseDAO = require('../../dao/learning/CourseDAO');
const CourseService = require('./CourseService');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

const QUIZ_NOT_FOUND = 'Quiz not found.';
const NO_ATTEMPTS_REMAINING = 'No quiz attempts remaining.';
const DEADLINE_PASSED = 'The quiz deadline has passed.';
const INVALID_ATTEMPT = 'The quiz attempt is invalid or no longer active.';
const ATTEMPT_SUBMITTED = 'This quiz attempt has already been submitted.';
const RESULT_UNAVAILABLE = 'Quiz result is available only after submission.';

class QuizService {
  assertValidId(id, field = 'Quiz') {
    if (!mongoose.isValidObjectId(id)) throw new ServiceError(400, `${field} ID is invalid.`);
  }

  async createQuiz(courseId, user, dto) {
    const course = await CourseService.getOwnedCourse(courseId, user);
    CourseService.assertContentEditable(course);
    const data = dto.toObject();
    await this.assertLessonBelongsToCourse(data.lessonId, course._id);
    return QuizDAO.create({ ...data, courseId: course._id });
  }

  async listQuizzes(courseId, user) {
    const course = await CourseService.getOwnedCourse(courseId, user);
    return QuizDAO.findByCourseId(course._id);
  }

  async getQuiz(quizId, user) {
    return this.getOwnedQuiz(quizId, user);
  }

  async getQuizDetails(quizId, user) {
    const quiz = await this.getOwnedQuiz(quizId, user);
    const questions = await QuestionDAO.findByQuizId(quiz._id);
    return { quiz, questions };
  }

  async updateQuiz(quizId, user, dto) {
    const { quiz, course } = await this.getOwnedQuiz(quizId, user, { includeCourse: true });
    CourseService.assertContentEditable(course);
    const updates = dto.toObject();
    if (Object.prototype.hasOwnProperty.call(updates, 'lessonId')) {
      await this.assertLessonBelongsToCourse(updates.lessonId, course._id);
    }
    const updated = await QuizDAO.update(quiz._id, updates);
    if (!updated) throw new ServiceError(409, 'The quiz changed while the request was being processed. Please try again.');
    return updated;
  }

  async deleteQuiz(quizId, user) {
    const { quiz, course } = await this.getOwnedQuiz(quizId, user, { includeCourse: true });
    CourseService.assertContentEditable(course);
    const deleted = await QuizDAO.softDelete(quiz._id);
    if (!deleted) throw new ServiceError(409, 'The quiz changed while the request was being processed. Please try again.');
    return deleted;
  }

  async getOwnedQuiz(quizId, user, { includeCourse = false } = {}) {
    this.assertValidId(quizId);
    const quiz = await QuizDAO.findById(quizId);
    if (!quiz) throw new ServiceError(404, QUIZ_NOT_FOUND);
    const course = await CourseService.getOwnedCourse(quiz.courseId, user);
    return includeCourse ? { quiz, course } : quiz;
  }

  async assertLessonBelongsToCourse(lessonId, courseId) {
    if (lessonId === null) return;
    this.assertValidId(lessonId, 'Lesson');
    const lesson = await LessonDAO.findById(lessonId);
    if (!lesson || String(lesson.courseId) !== String(courseId)) {
      throw new ServiceError(404, 'Lesson not found.');
    }
  }

  async startQuiz(quizId, user) {
    this.assertValidId(quizId);
    const quiz = await QuizDAO.findById(quizId);
    if (!quiz || quiz.isPublished === false) throw new ServiceError(404, QUIZ_NOT_FOUND);
    const course = await CourseDAO.findById(quiz.courseId);
    if (!course || course.status !== COURSE_STATUS.PUBLIC) throw new ServiceError(404, QUIZ_NOT_FOUND);
    const enrollment = await EnrollmentDAO.findAccessibleEnrollment(user._id, quiz.courseId);
    if (!enrollment) throw new ServiceError(403, 'You do not have permission to perform this action.');
    this.assertDeadlineAllowsAttempt(quiz);
    const attemptCount = await QuizAttemptDAO.countByUserAndQuiz(user._id, quiz._id);
    if (attemptCount >= quiz.attemptLimit) throw new ServiceError(409, NO_ATTEMPTS_REMAINING);

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + (Number(quiz.timeLimit) * 60 * 1000));
    const attempt = await QuizAttemptDAO.create({
      quizId: quiz._id,
      userId: user._id,
      courseId: quiz.courseId,
      lessonId: quiz.lessonId || null,
      status: 'in_progress',
      startedAt,
      expiresAt,
    });
    const questions = await QuestionDAO.findByQuizId(quiz._id);
    return {
      attempt: this.toStudentAttempt(attempt),
      quiz: { id: String(quiz._id), title: quiz.title, timeLimit: quiz.timeLimit, passingScore: quiz.passingScore },
      questions: questions.map((question) => this.toStudentQuestion(question)),
    };
  }

  async submitQuiz(attemptId, user, dto) {
    const attempt = await this.getActiveAttempt(attemptId, user);
    const quiz = await QuizDAO.findById(attempt.quizId);
    if (!quiz) throw new ServiceError(409, INVALID_ATTEMPT);
    this.assertDeadlineAllowsAttempt(quiz);
    const questions = await QuestionDAO.findByQuizId(quiz._id);
    const submittedAnswers = dto.toObject().answers;
    const answers = this.gradeAnswers(questions, submittedAnswers);
    const correctCount = answers.filter((answer) => answer.isCorrect).length;
    const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    const submittedAt = new Date();
    const updated = await QuizAttemptDAO.submit(attempt._id, user._id, {
      status: 'submitted',
      answers,
      score,
      passed: score >= quiz.passingScore,
      submittedAt,
    }, submittedAt);
    if (!updated) {
      const latest = await QuizAttemptDAO.findByIdForUser(attempt._id, user._id);
      if (latest?.status === 'submitted') throw new ServiceError(409, ATTEMPT_SUBMITTED);
      throw new ServiceError(409, INVALID_ATTEMPT);
    }
    if (updated.lessonId) {
      await ProgressDAO.upsertProgress(user._id, updated.courseId, updated.lessonId, 'completed');
    }
    return this.toStudentResult(updated);
  }

  async getQuizResult(attemptId, user) {
    this.assertValidId(attemptId, 'Quiz attempt');
    const attempt = await QuizAttemptDAO.findByIdForUser(attemptId, user._id);
    if (!attempt || attempt.status !== 'submitted') throw new ServiceError(409, RESULT_UNAVAILABLE);
    return this.toStudentResult(attempt);
  }

  async getActiveAttempt(attemptId, user) {
    this.assertValidId(attemptId, 'Quiz attempt');
    const attempt = await QuizAttemptDAO.findByIdForUser(attemptId, user._id);
    if (!attempt) throw new ServiceError(404, INVALID_ATTEMPT);
    if (attempt.status === 'submitted') throw new ServiceError(409, ATTEMPT_SUBMITTED);
    if (attempt.status !== 'in_progress' || !attempt.expiresAt || attempt.expiresAt <= new Date()) {
      throw new ServiceError(409, INVALID_ATTEMPT);
    }
    return attempt;
  }

  assertDeadlineAllowsAttempt(quiz) {
    if (quiz.deadline && new Date(quiz.deadline) <= new Date()) {
      throw new ServiceError(409, DEADLINE_PASSED);
    }
  }

  gradeAnswers(questions, submittedAnswers) {
    const questionById = new Map(questions.map((question) => [String(question._id), question]));
    const submittedByQuestion = new Map();
    for (const submitted of submittedAnswers) {
      const question = questionById.get(String(submitted.questionId));
      if (!question || !question.options.includes(submitted.answer)) {
        throw new ServiceError(400, 'Request failed.');
      }
      submittedByQuestion.set(String(question._id), submitted.answer);
    }
    return questions.map((question) => {
      const answer = submittedByQuestion.get(String(question._id)) || null;
      return { questionId: question._id, answer, isCorrect: answer === question.correctAnswer };
    });
  }

  toStudentQuestion(question) {
    return { id: String(question._id), questionText: question.questionText, options: question.options };
  }

  toStudentAttempt(attempt) {
    return {
      id: String(attempt._id),
      quizId: String(attempt.quizId),
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
    };
  }

  toStudentResult(attempt) {
    return {
      attemptId: String(attempt._id),
      quizId: String(attempt.quizId),
      status: attempt.status,
      score: attempt.score,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
      answers: (attempt.answers || []).map((answer) => ({
        questionId: String(answer.questionId),
        answer: answer.answer,
        isCorrect: answer.isCorrect,
      })),
    };
  }
}

module.exports = new QuizService();
