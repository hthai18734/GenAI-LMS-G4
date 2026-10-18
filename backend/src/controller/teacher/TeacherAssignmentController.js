const ResponseUtil = require('../../utils/common/ResponseUtil');
const AssignmentService = require('../../service/learning/AssignmentService');
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
}

module.exports = new TeacherAssignmentController();
