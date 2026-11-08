const ServiceError = require('../common/ServiceError');
const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
class AssignmentDocumentService {
  constructor(dependencies = {}) { Object.assign(this, dependencies); }
  async fromUpload(file) {
    if (!file) return undefined;
    if (!Number.isFinite(file.size) || file.size < 1 || file.size > 25 * 1024 * 1024) throw new ServiceError(400, 'Document must be non-empty and no larger than 25 MB.');
    if (!await this.documentStorageGateway.validDocument(file.filename, file.mimetype)) throw new ServiceError(400, 'The document content does not match PDF/Word format.');
    const name = String(file.originalname).replace(/\\/g, '/').split('/').pop().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || 'document';
    return { storageKey: file.filename, name, mimeType: file.mimetype, sizeBytes: file.size };
  }
  discard(file) { if (file?.filename) this.documentStorageGateway.removeBestEffort(this.documentStorageGateway.resolveWithin(file.filename)); }
  async previousSubmission(assignmentId, user) { return this.assignmentSubmissionRepository.findByAssignmentAndStudent(assignmentId, user._id); }
  async discardUnused(attachment) {
    if (attachment?.storageKey && !await this.assignmentDocumentRepository.isUsed(attachment.storageKey)) this.discard({ filename: attachment.storageKey });
  }
  async authorized(assignmentId, user) {
    if (!isValidIdentifier(assignmentId)) throw new ServiceError(400, 'Assignment ID is invalid.');
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment || assignment.deletedAt) throw new ServiceError(404, 'Assignment not found.');
    const course = await this.courseRepository.findById(assignment.courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');
    const owner = user.role === 'admin' || user.role === 'teacher' && String(course.teacherId) === String(user._id);
    if (!owner) {
      if (user.role !== 'student') throw new ServiceError(403, 'You do not have permission to access this document.');
      if (course.status !== 'PUBLIC') throw new ServiceError(404, 'Assignment not found.');
      if (!await this.enrollmentRepository.findAccessibleEnrollment(user._id, course._id)) throw new ServiceError(403, 'You must be enrolled to access this document.');
      if (assignment.lessonId) {
        const lesson = await this.lessonRepository.findById(assignment.lessonId);
        if (!lesson || lesson.deletedAt || !lesson.isPublished || String(lesson.courseId) !== String(course._id)) throw new ServiceError(404, 'Assignment not found.');
      }
    }
    return { assignment, owner };
  }
  info(attachment) {
    if (!attachment) throw new ServiceError(404, 'No document is attached.');
    const filePath = this.documentStorageGateway.resolveWithin(attachment.storageKey);
    if (!filePath || !this.documentStorageGateway.exists(filePath)) throw new ServiceError(410, 'The document is missing from storage.');
    return { filePath, fileName: attachment.name, mimeType: attachment.mimeType };
  }
  async downloadPrompt(id, user) { return this.info((await this.authorized(id, user)).assignment.attachment); }
  async downloadSubmission(id, user) {
    if (!isValidIdentifier(id)) throw new ServiceError(400, 'Submission ID is invalid.');
    const submission = await this.assignmentSubmissionRepository.findById(id);
    if (!submission) throw new ServiceError(404, 'Submission not found.');
    const { assignment, owner } = await this.authorized(submission.assignmentId, user);
    if (String(submission.courseId || assignment.courseId) !== String(assignment.courseId)) throw new ServiceError(404, 'Submission not found.');
    if (!owner && String(submission.studentId?._id || submission.studentId) !== String(user._id)) throw new ServiceError(403, 'You cannot access another student submission.');
    return this.info(submission.attachment);
  }
  async sweepExpired() {
    for (const filename of this.documentStorageGateway.expiredDocumentFilenames()) await this.discardUnused({ storageKey: filename });
  }
}
module.exports = AssignmentDocumentService;
