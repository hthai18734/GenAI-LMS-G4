module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { quizService: QuizService } = UseCases;
const SubmitQuizDTO = require('../../dto/student/SubmitQuizDTO');
const { assignmentService: AssignmentService } = UseCases;

class StudentQuizController {
  validationError(res, errors) {
    return ResponseUtil.error(res, { status: 400, message: 'Missing required fields.', errors });
  }

  async start(req, res, next) {
    try {
      const session = await QuizService.startQuiz(req.params.quizId, req.user);
      return ResponseUtil.success(res, { status: 201, message: 'Quiz attempt started successfully.', data: session });
    } catch (error) { return next(error); }
  }

  async listByCourse(req, res, next) {
    try {
      const quizzes = await QuizService.listAvailableQuizzes(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { quizzes } });
    } catch (error) { return next(error); }
  }

  async submitAssignment(req, res, next) {
    try {
      const submission = await AssignmentService.submitAssignment(req.params.assignmentId, req.user, req.body?.answer);
      return ResponseUtil.success(res, { status: 201, message: 'Assignment submitted for grading.', data: { submission } });
    } catch (error) { return next(error); }
  }

  async submit(req, res, next) {
    try {
      const dto = new SubmitQuizDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const result = await QuizService.submitQuiz(req.params.attemptId, req.user, dto);
      return ResponseUtil.success(res, { message: 'Quiz submitted successfully.', data: { result } });
    } catch (error) { return next(error); }
  }

  async getResult(req, res, next) {
    try {
      const result = await QuizService.getQuizResult(req.params.attemptId, req.user);
      return ResponseUtil.success(res, { data: { result } });
    } catch (error) { return next(error); }
  }
}

return  new StudentQuizController();
};
