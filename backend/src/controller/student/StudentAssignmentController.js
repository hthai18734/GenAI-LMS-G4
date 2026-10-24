const { assignmentService: AssignmentService } = require('../../composition/services');
const ResponseUtil = require('../../utils/common/ResponseUtil');

class StudentAssignmentController {
  async listAvailable(req, res, next) {
    try {
      const assignments = await AssignmentService.listAvailableAssignments(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { assignments } });
    } catch (error) { return next(error); }
  }
}
module.exports = new StudentAssignmentController();
