const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

const QUESTION_NOT_FOUND = 'Question not found.';
const INVALID_QUESTION = 'Invalid question content.';

class QuestionService {
  constructor({ questionRepository, quizQuestionRepository, categoryRepository, quizService, courseService } = {}) {
    this.questionRepository = questionRepository;
    this.quizQuestionRepository = quizQuestionRepository;
    this.categoryRepository = categoryRepository;
    this.quizService = quizService;
    this.courseService = courseService;
  }
  assertValidId(id, field = 'Question') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} ID is invalid.`);
  }

  async persistQuestion(user, data, { quizId = null, categoryId = null } = {}) {
    this.assertQuestionContent(data);
    if (categoryId) {
      this.assertValidId(categoryId, 'Category');
      const cat = await this.categoryRepository.findById(categoryId);
      if (!cat) throw new ServiceError(404, 'Category not found.');
    }
    return this.questionRepository.create({
      ...data,
      ownerTeacherId: user._id,
      categoryId: categoryId || null,
      quizId: quizId || null,
    });
  }

  async createQuestion(quizId, user, dto) {
    const { quiz, course } = await this.quizService.getOwnedQuiz(quizId, user, { includeCourse: true });
    this.courseService.assertContentEditable(course);
    const data = dto.toObject();
    const categoryId = data.categoryId || course.categoryId || null;
    const question = await this.persistQuestion(user, data, { quizId: quiz._id, categoryId });
    await this.quizQuestionRepository.linkQuestion(quiz._id, question._id);
    return question;
  }

  async createBankQuestion(user, dto) {
    const data = dto.toObject();
    return this.persistQuestion(user, data, { quizId: null, categoryId: data.categoryId || null });
  }

  async listBankQuestions(user, { categoryId = null, keyword = '', page = 1, limit = 50 } = {}) {
    return this.questionRepository.findByOwner(user._id, { categoryId, keyword, page, limit });
  }

  async getQuestionDetails(questionId, user) {
    this.assertValidId(questionId);
    const question = await this.questionRepository.findById(questionId);
    if (!question || (question.ownerTeacherId && String(question.ownerTeacherId) !== String(user._id))) {
      throw new ServiceError(404, QUESTION_NOT_FOUND);
    }
    const usageCount = await this.quizQuestionRepository.countActiveByQuestionId(question._id);
    const qObj = typeof question.toObject === 'function' ? question.toObject() : question;
    return { ...qObj, usageCount };
  }

  async updateQuestion(questionId, user, dto) {
    const question = await this.getOwnedQuestion(questionId, user);
    if (question.quizId) {
      try {
        const { course } = await this.quizService.getOwnedQuiz(question.quizId, user, { includeCourse: true });
        if (course) this.courseService.assertContentEditable(course);
      } catch (err) {
        // Quiz soft-deleted or course checked
      }
    }
    const updates = dto.toObject();
    this.assertQuestionContent({
      questionText: question.questionText,
      options: question.options,
      correctAnswer: question.correctAnswer,
      ...updates,
    });
    if (updates.categoryId) {
      this.assertValidId(updates.categoryId, 'Category');
      const cat = await this.categoryRepository.findById(updates.categoryId);
      if (!cat) throw new ServiceError(404, 'Category not found.');
    }
    const updated = await this.questionRepository.update(question._id, updates);
    if (!updated) throw new ServiceError(409, 'The question changed while the request was being processed. Please try again.');
    return updated;
  }

  async deleteQuestion(questionId, user) {
    const question = await this.getOwnedQuestion(questionId, user);
    if (question.quizId) {
      try {
        const { course } = await this.quizService.getOwnedQuiz(question.quizId, user, { includeCourse: true });
        if (course) this.courseService.assertContentEditable(course);
      } catch (err) {
        // Allowed if quiz already removed
      }
    }
    // Requirement #6: Khi xóa Question đang được Quiz hoạt động sử dụng, trả HTTP 409
    const activeQuizCount = await this.quizQuestionRepository.countActiveByQuestionId(question._id);
    if (activeQuizCount > 0) {
      throw new ServiceError(409, `Cannot delete question because it is currently linked to ${activeQuizCount} active quiz(zes). Please unlink it first.`);
    }
    const deleted = await this.questionRepository.softDelete(question._id);
    if (!deleted) throw new ServiceError(409, 'The question changed while the request was being processed. Please try again.');
    return deleted;
  }

  async linkQuestionToQuiz(quizId, questionId, user) {
    const { quiz, course } = await this.quizService.getOwnedQuiz(quizId, user, { includeCourse: true });
    this.courseService.assertContentEditable(course);
    const question = await this.getOwnedQuestion(questionId, user);
    const mapping = await this.quizQuestionRepository.linkQuestion(quiz._id, question._id);
    return { mapping, question };
  }

  async batchLinkQuestionsToQuiz(quizId, questionIds, user) {
    const { quiz, course } = await this.quizService.getOwnedQuiz(quizId, user, { includeCourse: true });
    this.courseService.assertContentEditable(course);
    const validIds = (questionIds || []).filter((id) => isValidIdentifier(id));
    const linked = [];
    for (const qId of validIds) {
      const question = await this.questionRepository.findById(qId);
      if (question && (!question.ownerTeacherId || String(question.ownerTeacherId) === String(user._id))) {
        await this.quizQuestionRepository.linkQuestion(quiz._id, question._id);
        linked.push(question);
      }
    }
    return linked;
  }

  async unlinkQuestionFromQuiz(quizId, questionId, user) {
    const { quiz, course } = await this.quizService.getOwnedQuiz(quizId, user, { includeCourse: true });
    this.courseService.assertContentEditable(course);
    this.assertValidId(questionId);
    await this.quizQuestionRepository.unlinkQuestion(quiz._id, questionId);
    return { success: true, message: 'Question unlinked from quiz successfully.' };
  }

  async getOwnedQuestion(questionId, user, { includeCourse = false } = {}) {
    this.assertValidId(questionId);
    const question = await this.questionRepository.findById(questionId);
    if (!question) throw new ServiceError(404, QUESTION_NOT_FOUND);

    if (question.ownerTeacherId) {
      if (String(question.ownerTeacherId) !== String(user._id)) {
        throw new ServiceError(403, 'You do not have permission to access this question.');
      }
    } else if (question.quizId) {
      await this.quizService.getOwnedQuiz(question.quizId, user);
    }

    if (includeCourse && question.quizId) {
      const quizResult = await this.quizService.getOwnedQuiz(question.quizId, user, { includeCourse: true });
      return { question, quiz: quizResult.quiz, course: quizResult.course };
    }
    return question;
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

module.exports = QuestionService;
