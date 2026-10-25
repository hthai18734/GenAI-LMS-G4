const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

const QUIZ_NOT_FOUND = 'Quiz not found.';
const NO_ATTEMPTS_REMAINING = 'No quiz attempts remaining.';
const DEADLINE_PASSED = 'The quiz deadline has passed.';
const QUIZ_NOT_OPEN = 'The quiz is not open yet.';
const INVALID_ATTEMPT = 'The quiz attempt is invalid or no longer active.';
const ATTEMPT_SUBMITTED = 'This quiz attempt has already been submitted.';
const RESULT_UNAVAILABLE = 'Quiz result is available only after submission.';

class QuizService {
  constructor({ quizRepository, lessonRepository, questionRepository, quizQuestionRepository, quizAttemptRepository, enrollmentRepository, progressRepository, courseRepository, courseService } = {}) {
    this.quizRepository = quizRepository;
    this.lessonRepository = lessonRepository;
    this.questionRepository = questionRepository;
    this.quizQuestionRepository = quizQuestionRepository;
    this.quizAttemptRepository = quizAttemptRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.progressRepository = progressRepository;
    this.courseRepository = courseRepository;
    this.courseService = courseService;
  }
  assertValidId(id, field = 'Quiz') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} ID is invalid.`);
  }

  async createQuiz(courseId, user, dto) {
    const course = await this.courseService.getOwnedCourse(courseId, user);
    this.courseService.assertContentEditable(course);
    const data = dto.toObject();
    await this.assertLessonBelongsToCourse(data.lessonId, course._id);
    return this.quizRepository.create({ ...data, courseId: course._id });
  }

  async listQuizzes(courseId, user) {
    const course = await this.courseService.getOwnedCourse(courseId, user);
    return this.quizRepository.findByCourseId(course._id);
  }

  async getQuiz(quizId, user) {
    return this.getOwnedQuiz(quizId, user);
  }

  async getQuizQuestions(quizId) {
    const questionIds = await this.quizQuestionRepository.findQuestionIdsByQuizId(quizId);
    if (questionIds && questionIds.length > 0) {
      return this.questionRepository.findByIds(questionIds);
    }
    // Fallback for tests or legacy data
    return this.questionRepository.findByQuizId(quizId);
  }

  async getQuizDetails(quizId, user) {
    const quiz = await this.getOwnedQuiz(quizId, user);
    const questions = await this.getQuizQuestions(quiz._id);
    return { quiz, questions };
  }

  async listAvailableQuizzes(courseId, user) {
    this.assertValidId(courseId, 'Course');
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt || course.status !== COURSE_STATUS.PUBLIC) throw new ServiceError(404, 'Course not found.');
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, courseId);
    if (!enrollment) throw new ServiceError(403, 'You do not have permission to perform this action.');
    const quizzes = await this.quizRepository.findByCourseId(courseId, { publishedOnly: true });
    const attempts = await this.quizAttemptRepository.findLatestSubmittedByUserAndQuizIds(user._id, quizzes.map((quiz) => quiz._id));
    const latestAttemptByQuizId = new Map();
    for (const attempt of attempts) {
      const quizId = String(attempt.quizId);
      if (!latestAttemptByQuizId.has(quizId)) latestAttemptByQuizId.set(quizId, attempt);
    }

    return quizzes.map((quiz) => {
      const latestAttempt = latestAttemptByQuizId.get(String(quiz._id));
      return {
        ...(typeof quiz.toObject === 'function' ? quiz.toObject() : quiz),
        latestAttempt: latestAttempt ? this.toLatestStudentAttempt(latestAttempt) : null,
      };
    });
  }

  async updateQuiz(quizId, user, dto) {
    const { quiz, course } = await this.getOwnedQuiz(quizId, user, { includeCourse: true });
    this.courseService.assertContentEditable(course);
    const updates = dto.toObject();
    if (Object.prototype.hasOwnProperty.call(updates, 'lessonId')) {
      await this.assertLessonBelongsToCourse(updates.lessonId, course._id);
    }
    const updated = await this.quizRepository.update(quiz._id, updates);
    if (!updated) throw new ServiceError(409, 'The quiz changed while the request was being processed. Please try again.');
    return updated;
  }

  async deleteQuiz(quizId, user) {
    const { quiz, course } = await this.getOwnedQuiz(quizId, user, { includeCourse: true });
    this.courseService.assertContentEditable(course);
    const deleted = await this.quizRepository.softDelete(quiz._id);
    if (!deleted) throw new ServiceError(409, 'The quiz changed while the request was being processed. Please try again.');
    // Requirement #7: Xóa Quiz không được xóa Question khỏi Question Bank, chỉ xóa/gỡ mapping
    await this.quizQuestionRepository.deleteByQuizId(quiz._id);
    return deleted;
  }

  async getOwnedQuiz(quizId, user, { includeCourse = false } = {}) {
    this.assertValidId(quizId);
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) throw new ServiceError(404, QUIZ_NOT_FOUND);
    const course = await this.courseService.getOwnedCourse(quiz.courseId, user);
    return includeCourse ? { quiz, course } : quiz;
  }

  async assertLessonBelongsToCourse(lessonId, courseId) {
    if (lessonId === null) return;
    this.assertValidId(lessonId, 'Lesson');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || String(lesson.courseId) !== String(courseId)) {
      throw new ServiceError(404, 'Lesson not found.');
    }
  }

  async startQuiz(quizId, user) {
    this.assertValidId(quizId);
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz || quiz.isPublished === false) throw new ServiceError(404, QUIZ_NOT_FOUND);
    const course = await this.courseRepository.findById(quiz.courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, QUIZ_NOT_FOUND);
    if (course.status !== COURSE_STATUS.PUBLIC) {
      throw new ServiceError(409, 'This course is not published. The teacher must publish it before you can start this quiz.');
    }
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, quiz.courseId);
    if (!enrollment) throw new ServiceError(403, 'You do not have permission to perform this action.');
    const attemptCount = await this.quizAttemptRepository.countByUserAndQuiz(user._id, quiz._id);
    if (attemptCount >= quiz.attemptLimit) throw new ServiceError(409, NO_ATTEMPTS_REMAINING);

    const questions = await this.getQuizQuestions(quiz._id);
    const startedAt = new Date();
    if (!questions.length) throw new ServiceError(409, 'This quiz has no questions yet.');
    const expiresAt = new Date(startedAt.getTime() + (Number(quiz.timeLimit) * 60 * 1000));

    const questionsSnapshot = questions.map((q) => ({
      questionId: q._id,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
    }));

    const attempt = await this.quizAttemptRepository.create({
      quizId: quiz._id,
      userId: user._id,
      courseId: quiz.courseId,
      lessonId: quiz.lessonId || null,
      status: 'in_progress',
      startedAt,
      expiresAt,
      questionsSnapshot,
    });

    return {
      attempt: this.toStudentAttempt(attempt),
      quiz: { id: String(quiz._id), title: quiz.title, timeLimit: quiz.timeLimit, passingScore: quiz.passingScore },
      questions: questions.map((question) => this.toStudentQuestion(question)),
    };
  }

  async submitQuiz(attemptId, user, dto) {
    const attempt = await this.getActiveAttempt(attemptId, user);
    const quiz = await this.quizRepository.findById(attempt.quizId);
    if (!quiz) throw new ServiceError(409, INVALID_ATTEMPT);

    // Chấm điểm bằng snapshot nếu có, ngược lại fallback sang questions hiện hành
    let questions = attempt.questionsSnapshot;
    if (!questions || questions.length === 0) {
      questions = await this.getQuizQuestions(quiz._id);
    }

    const submittedAnswers = dto.toObject().answers;
    const answers = this.gradeAnswers(questions, submittedAnswers);
    const correctCount = answers.filter((answer) => answer.isCorrect).length;
    const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    const submittedAt = new Date();

    const updated = await this.quizAttemptRepository.submit(attempt._id, user._id, {
      status: 'submitted',
      answers,
      score,
      passed: score >= quiz.passingScore,
      submittedAt,
    }, submittedAt);

    if (!updated) {
      const latest = await this.quizAttemptRepository.findByIdForUser(attempt._id, user._id);
      if (latest?.status === 'submitted') throw new ServiceError(409, ATTEMPT_SUBMITTED);
      throw new ServiceError(409, INVALID_ATTEMPT);
    }

    if (updated.lessonId) {
      await this.progressRepository.upsertProgress(user._id, updated.courseId, updated.lessonId, 'completed');
    }

    return this.toStudentResult(updated);
  }

  async getQuizResult(attemptId, user) {
    this.assertValidId(attemptId, 'Quiz attempt');
    const attempt = await this.quizAttemptRepository.findByIdForUser(attemptId, user._id);
    if (!attempt || attempt.status !== 'submitted') throw new ServiceError(409, RESULT_UNAVAILABLE);
    return this.toStudentResult(attempt);
  }

  async getActiveAttempt(attemptId, user) {
    this.assertValidId(attemptId, 'Quiz attempt');
    const attempt = await this.quizAttemptRepository.findByIdForUser(attemptId, user._id);
    if (!attempt) throw new ServiceError(404, INVALID_ATTEMPT);
    if (attempt.status === 'submitted') throw new ServiceError(409, ATTEMPT_SUBMITTED);
    if (attempt.status !== 'in_progress' || !attempt.expiresAt || attempt.expiresAt <= new Date()) {
      throw new ServiceError(409, INVALID_ATTEMPT);
    }
    return attempt;
  }



  gradeAnswers(questions, submittedAnswers) {
    const questionById = new Map(questions.map((question) => [String(question._id || question.questionId), question]));
    const submittedByQuestion = new Map();
    for (const submitted of submittedAnswers) {
      const question = questionById.get(String(submitted.questionId));
      if (!question || !question.options.includes(submitted.answer)) {
        throw new ServiceError(400, 'Request failed.');
      }
      submittedByQuestion.set(String(question._id || question.questionId), submitted.answer);
    }
    return questions.map((question) => {
      const qId = question._id || question.questionId;
      const answer = submittedByQuestion.get(String(qId)) || null;
      return {
        questionId: qId,
        questionText: question.questionText,
        answer,
        isCorrect: answer === question.correctAnswer,
      };
    });
  }

  toStudentQuestion(question) {
    return { id: String(question._id || question.questionId), questionText: question.questionText, options: question.options };
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
      courseId: String(attempt.courseId),
      status: attempt.status,
      score: attempt.score,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
      answers: (attempt.answers || []).map((answer) => ({
        questionId: String(answer.questionId),
        questionText: answer.questionText || '',
        answer: answer.answer,
        isCorrect: answer.isCorrect,
      })),
    };
  }

  toLatestStudentAttempt(attempt) {
    return {
      id: String(attempt._id),
      score: attempt.score,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt,
    };
  }
}

module.exports = QuizService;
