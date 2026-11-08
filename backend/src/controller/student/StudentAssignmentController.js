module.exports = function createController(UseCases) {
const { assignmentService: AssignmentService } = UseCases;
const ResponseUtil = require('../../utils/common/ResponseUtil');
const uploadInput = require('../common/AssignmentUploadInput');
const documents = UseCases.assignmentDocumentService;

class StudentAssignmentController {
  async listAvailable(req, res, next) {
    try {
      const assignments = await AssignmentService.listAvailableAssignments(req.params.courseId, req.user);
      return ResponseUtil.success(res, { data: { assignments } });
    } catch (error) { return next(error); }
  }

  async submitAssignment(req, res, next) {
    try {
      const data = uploadInput(req);
      if (!data || typeof data !== 'object' || Object.keys(data).some(key => !['answer', 'revision'].includes(key))) return ResponseUtil.error(res, { status: 400, message: 'Only answer and revision are accepted.' });
      const attachment = req.file ? await documents.fromUpload(req.file) : undefined;
      const previous = attachment ? await documents.previousSubmission(req.params.assignmentId, req.user) : null;
      const submission = attachment || data.revision !== undefined
        ? await AssignmentService.submitAssignment(req.params.assignmentId, req.user, data.answer ?? '', attachment, data.revision)
        : await AssignmentService.submitAssignment(req.params.assignmentId, req.user, data.answer ?? '');
      if (previous?.attachment) await documents.discardUnused(previous.attachment).catch(() => {});
      return ResponseUtil.success(res, { message: 'Assignment submitted successfully.', data: { submission } });
    } catch (error) { return next(error); }
    finally { if (req.file) await documents.discardUnused({ storageKey: req.file.filename }).catch(() => {}); }
  }
}
return  new StudentAssignmentController();
};
