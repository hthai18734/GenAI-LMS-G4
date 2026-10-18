const ResponseUtil = require('../../utils/common/ResponseUtil');
const QuestionService = require('../../service/learning/QuestionService');
const CreateQuestionDTO = require('../../dto/question/CreateQuestionDTO');
const UpdateQuestionDTO = require('../../dto/question/UpdateQuestionDTO');

const INVALID_QUESTION = 'Invalid question content.';

class TeacherQuestionController {
  validationError(res, errors) {
    return ResponseUtil.error(res, { status: 400, message: INVALID_QUESTION, errors });
  }

  async create(req, res, next) {
    try {
      const dto = new CreateQuestionDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const question = await QuestionService.createQuestion(req.params.quizId, req.user, dto);
      return ResponseUtil.success(res, { status: 201, message: 'Question added successfully.', data: { question } });
    } catch (error) { return next(error); }
  }

  async update(req, res, next) {
    try {
      const dto = new UpdateQuestionDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const question = await QuestionService.updateQuestion(req.params.questionId, req.user, dto);
      return ResponseUtil.success(res, { message: 'Question updated successfully.', data: { question } });
    } catch (error) { return next(error); }
  }

  async remove(req, res, next) {
    try {
      await QuestionService.deleteQuestion(req.params.questionId, req.user);
      return ResponseUtil.success(res, { message: 'Question deleted successfully.' });
    } catch (error) { return next(error); }
  }
}

module.exports = new TeacherQuestionController();
