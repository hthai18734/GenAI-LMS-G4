module.exports = function createController(UseCases) {
const { assignmentService: AssignmentService } = UseCases;
const ResponseUtil = require('../../utils/common/ResponseUtil');

class StudentAssignmentController {
  async listAvailable(req, res, next) {
    try {
      const assignments = await AssignmentService.listAvailableAssignments(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { assignments } });
    } catch (error) { return next(error); }
  }

  async submitAssignment(req, res, next) {
    try {
      const submission = await AssignmentService.submitAssignment(req.params.assignmentId, req.user, req.body?.answer);
      return ResponseUtil.success(res, { message: 'Assignment submitted successfully.', data: { submission } });
    } catch (error) { return next(error); }
  }
}
return  new StudentAssignmentController();
};
