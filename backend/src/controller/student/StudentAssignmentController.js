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
}
return  new StudentAssignmentController();
};
