module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { questionService: QuestionService } = UseCases;
const CreateQuestionDTO = require('../../dto/question/CreateQuestionDTO');
const UpdateQuestionDTO = require('../../dto/question/UpdateQuestionDTO');

const INVALID_QUESTION = 'Invalid question content.';

class TeacherQuestionController {
  validationError(res, errors) {
    return ResponseUtil.error(res, { status: 400, message: INVALID_QUESTION, errors });
  }

  async list(req, res, next) {
    try {
      const { categoryId, keyword, page, limit } = req.query;
      const result = await QuestionService.listBankQuestions(req.user, {
        categoryId,
        keyword,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const question = await QuestionService.getQuestionDetails(req.params.questionId, req.user);
      return ResponseUtil.success(res, { data: { question } });
    } catch (error) {
      return next(error);
    }
  }

  async createInBank(req, res, next) {
    try {
      const dto = new CreateQuestionDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const question = await QuestionService.createBankQuestion(req.user, dto.toObject());
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Question added to question bank successfully.',
        data: { question },
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const dto = new CreateQuestionDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const question = await QuestionService.createQuestion(req.params.quizId, req.user, dto.toObject());
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Question added successfully.',
        data: { question },
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const dto = new UpdateQuestionDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const question = await QuestionService.updateQuestion(req.params.questionId, req.user, dto.toObject());
      return ResponseUtil.success(res, { message: 'Question updated successfully.', data: { question } });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await QuestionService.deleteQuestion(req.params.questionId, req.user);
      return ResponseUtil.success(res, { message: 'Question deleted successfully.' });
    } catch (error) {
      return next(error);
    }
  }

  async link(req, res, next) {
    try {
      const result = await QuestionService.linkQuestionToQuiz(req.params.quizId, req.params.questionId, req.user);
      return ResponseUtil.success(res, {
        status: 200,
        message: 'Question linked to quiz successfully.',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async batchLink(req, res, next) {
    try {
      const { questionIds } = req.body || {};
      if (!Array.isArray(questionIds) || !questionIds.length) {
        return ResponseUtil.error(res, { status: 400, message: 'questionIds array is required.' });
      }
      const linked = await QuestionService.batchLinkQuestionsToQuiz(req.params.quizId, questionIds, req.user);
      return ResponseUtil.success(res, {
        status: 200,
        message: `Linked ${linked.length} question(s) to quiz successfully.`,
        data: { questions: linked },
      });
    } catch (error) {
      return next(error);
    }
  }

  async unlink(req, res, next) {
    try {
      const result = await QuestionService.unlinkQuestionFromQuiz(req.params.quizId, req.params.questionId, req.user);
      return ResponseUtil.success(res, { message: result.message });
    } catch (error) {
      return next(error);
    }
  }
}

return  new TeacherQuestionController();
};
