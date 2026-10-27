module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { quizService: QuizService } = UseCases;
const CreateQuizDTO = require('../../dto/quiz/CreateQuizDTO');
const UpdateQuizDTO = require('../../dto/quiz/UpdateQuizDTO');

class TeacherQuizController {
  validationError(res, errors) {
    const message = errors.timeLimit || errors.attemptLimit
      ? 'Invalid quiz time or attempt limit.'
      : 'Validation failed.';
    return ResponseUtil.error(res, { status: 400, message, errors });
  }

  async create(req, res, next) {
    try {
      const dto = new CreateQuizDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const quiz = await QuizService.createQuiz(req.params.courseId, req.user, dto.toObject());
      return ResponseUtil.success(res, { status: 201, message: 'Quiz created successfully.', data: { quiz } });
    } catch (error) { return next(error); }
  }

  async list(req, res, next) {
    try {
      const quizzes = await QuizService.listQuizzes(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { quizzes } });
    } catch (error) { return next(error); }
  }

  async getById(req, res, next) {
    try {
      const { quiz, questions } = await QuizService.getQuizDetails(req.params.quizId, req.user);
      return ResponseUtil.success(res, { data: { quiz, questions } });
    } catch (error) { return next(error); }
  }

  async listByCourse(req, res, next) {
    try {
      const quizzes = await QuizService.listOwnedQuizzes(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { quizzes } });
    } catch (error) { return next(error); }
  }

  async listQuestions(req, res, next) {
    try {
      const questions = await QuizService.listQuestions(req.params.quizId, req.user);
      return ResponseUtil.success(res, { data: { questions } });
    } catch (error) { return next(error); }
  }

  async update(req, res, next) {
    try {
      const dto = new UpdateQuizDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const quiz = await QuizService.updateQuiz(req.params.quizId, req.user, dto.toObject());
      return ResponseUtil.success(res, { message: 'Quiz updated successfully.', data: { quiz } });
    } catch (error) { return next(error); }
  }

  async remove(req, res, next) {
    try {
      await QuizService.deleteQuiz(req.params.quizId, req.user);
      return ResponseUtil.success(res, { message: 'Quiz deleted successfully.' });
    } catch (error) { return next(error); }
  }
}

return  new TeacherQuizController();
};
