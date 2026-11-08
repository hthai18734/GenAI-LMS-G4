module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { assignmentService: AssignmentService } = UseCases;
const CreateAssignmentDTO = require('../../dto/assignment/CreateAssignmentDTO');
const UpdateAssignmentDTO = require('../../dto/assignment/UpdateAssignmentDTO');
const SubmissionDTO = require('../../dto/assignment/SubmissionDTO');
const { assignmentAssessmentService } = UseCases;
const documents = UseCases.assignmentDocumentService;
const uploadInput = require('../common/AssignmentUploadInput');

class TeacherAssignmentController {
  validationError(res, errors) {
    return ResponseUtil.error(res, { status: 400, message: 'Invalid assignment information.', errors });
  }

  async create(req, res, next) {
    try {
      const dto = new CreateAssignmentDTO(uploadInput(req));
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const attachment = req.file ? await documents.fromUpload(req.file) : undefined;
      const assignment = await AssignmentService.createAssignment(req.params.courseId, req.user, { ...dto.toObject(), ...(attachment ? { attachment } : {}) });
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Assignment created successfully.',
        data: { assignment },
      });
    } catch (error) { return next(error); }
    finally { if (req.file) await documents.discardUnused({ storageKey: req.file.filename }).catch(() => {}); }
  }

  async list(req, res, next) {
    try {
      const assignments = await AssignmentService.listAssignments(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { assignments } });
    } catch (error) { return next(error); }
  }

  async getById(req, res, next) {
    try {
      const assignment = await AssignmentService.getAssignment(req.params.assignmentId, req.user);
      return ResponseUtil.success(res, { data: { assignment } });
    } catch (error) { return next(error); }
  }

  async update(req, res, next) {
    try {
      const dto = new UpdateAssignmentDTO(uploadInput(req));
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const attachment = req.file ? await documents.fromUpload(req.file) : undefined;
      const previous = attachment ? await AssignmentService.getAssignment(req.params.assignmentId, req.user) : null;
      const assignment = await AssignmentService.updateAssignment(req.params.assignmentId, req.user, { ...dto.toObject(), ...(attachment ? { attachment } : {}) });
      if (previous?.attachment) await documents.discardUnused(previous.attachment).catch(() => {});
      return ResponseUtil.success(res, { message: 'Assignment updated successfully.', data: { assignment } });
    } catch (error) { return next(error); }
    finally { if (req.file) await documents.discardUnused({ storageKey: req.file.filename }).catch(() => {}); }
  }

  async remove(req, res, next) {
    try {
      await AssignmentService.deleteAssignment(req.params.assignmentId, req.user);
      return ResponseUtil.success(res, { message: 'Assignment deleted successfully.' });
    } catch (error) { return next(error); }
  }

  async grade(req, res, next) {
    try {
      const dto = new SubmissionDTO(req.body, 'grade'); const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const submission = await assignmentAssessmentService.grade(req.params.submissionId, req.user, dto.toObject());
      return ResponseUtil.success(res, { message: 'Assignment submission graded successfully.', data: { submission } });
    } catch (error) { return next(error); }
  }
  async submissions(req, res, next) {
    try {
      const dto = new SubmissionDTO(req.query); const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      return ResponseUtil.success(res, { data: await assignmentAssessmentService.list(req.params.assignmentId, req.user, dto.toObject()) });
    } catch (error) { return next(error); }
  }
  async submission(req, res, next) {
    try { return ResponseUtil.success(res, { data: { submission: await assignmentAssessmentService.detail(req.params.submissionId, req.user) } }); }
    catch (error) { return next(error); }
  }
  async feedback(req, res, next) {
    try {
      const dto = new SubmissionDTO(req.body, 'feedback'); const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      return ResponseUtil.success(res, { data: { submission: await assignmentAssessmentService.feedback(req.params.submissionId, req.user, dto.toObject()) } });
    } catch (error) { return next(error); }
  }
}

return  new TeacherAssignmentController();
};
