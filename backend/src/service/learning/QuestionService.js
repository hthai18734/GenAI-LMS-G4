const mongoose = require('mongoose');
const QuestionDAO = require('../../dao/learning/QuestionDAO');
const QuizService = require('./QuizService');
const CourseService = require('./CourseService');
const ServiceError = require('../common/ServiceError');

const QUESTION_NOT_FOUND = 'Question not found.';
const INVALID_QUESTION = 'Invalid question content.';

class QuestionService {
  assertValidId(id, field = 'Question') {
    if (!mongoose.isValidObjectId(id)) throw new ServiceError(400, `${field} ID is invalid.`);
  }

  async createQuestion(quizId, user, dto) {
    const { quiz, course } = await QuizService.getOwnedQuiz(quizId, user, { includeCourse: true });
    CourseService.assertContentEditable(course);
    const data = dto.toObject();
    this.assertQuestionContent(data);
    return QuestionDAO.create({ ...data, quizId: quiz._id });
  }

  async updateQuestion(questionId, user, dto) {
    const { question, course } = await this.getOwnedQuestion(questionId, user, { includeCourse: true });
    CourseService.assertContentEditable(course);
    const updates = dto.toObject();
    this.assertQuestionContent({
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      ...updates,
    });
    const updated = await QuestionDAO.update(question._id, updates);
    if (!updated) throw new ServiceError(409, 'The question changed while the request was being processed. Please try again.');
    return updated;
  }

  async deleteQuestion(questionId, user) {
    const { question, course } = await this.getOwnedQuestion(questionId, user, { includeCourse: true });
    CourseService.assertContentEditable(course);
    const deleted = await QuestionDAO.softDelete(question._id);
    if (!deleted) throw new ServiceError(409, 'The question changed while the request was being processed. Please try again.');
    return deleted;
  }

  async getOwnedQuestion(questionId, user, { includeCourse = false } = {}) {
    this.assertValidId(questionId);
    const question = await QuestionDAO.findById(questionId);
    if (!question) throw new ServiceError(404, QUESTION_NOT_FOUND);
    const quizResult = await QuizService.getOwnedQuiz(question.quizId, user, { includeCourse: true });
    return includeCourse ? { question, quiz: quizResult.quiz, course: quizResult.course } : question;
  }

  assertQuestionContent({ questionText, options, correctAnswer }) {
    if (typeof questionText !== 'string' || !questionText.trim()
      || !Array.isArray(options) || options.length < 2
      || options.some((option) => typeof option !== 'string' || !option.trim())
      || typeof correctAnswer !== 'string' || !correctAnswer.trim()
      || !options.includes(correctAnswer)) {
      throw new ServiceError(400, INVALID_QUESTION);
    }
  }
}

module.exports = new QuestionService();
