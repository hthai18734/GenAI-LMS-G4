module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { assignmentService: AssignmentService } = UseCases;
const CreateAssignmentDTO = require('../../dto/assignment/CreateAssignmentDTO');

class TeacherAssignmentController {
  validationError(res, errors) {
    return ResponseUtil.error(res, { status: 400, message: 'Invalid assignment information.', errors });
  }

  async create(req, res, next) {
    try {
      const dto = new CreateAssignmentDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const assignment = await AssignmentService.createAssignment(req.params.courseId, req.user, dto);
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Assignment created successfully.',
        data: { assignment },
      });
    } catch (error) { return next(error); }
  }

  async list(req, res, next) {
    try {
      const assignments = await AssignmentService.listAssignments(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { assignments } });
    } catch (error) { return next(error); }
  }

  async grade(req, res, next) {
    try {
      if (typeof req.body?.passed !== 'boolean') return ResponseUtil.error(res, { status: 400, message: 'passed must be a boolean.' });
      const submission = await AssignmentService.gradeSubmission(req.params.submissionId, req.user, req.body.passed, req.body.feedback || '');
      return ResponseUtil.success(res, { message: 'Assignment submission graded successfully.', data: { submission } });
    } catch (error) { return next(error); }
  }
}

return  new TeacherAssignmentController();
};
