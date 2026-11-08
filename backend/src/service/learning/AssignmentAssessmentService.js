const ServiceError = require('../common/ServiceError');
class AssignmentAssessmentService {
  constructor(dependencies = {}) { Object.assign(this, dependencies); }
  async owned(id, user) {
    const submission = await this.assignmentSubmissionRepository.findById(id);
    if (!submission) throw new ServiceError(404, 'Assignment submission not found.');
    const assignment = await this.assignmentRepository.findById(submission.assignmentId);
    if (!assignment || String(submission.courseId) !== String(assignment.courseId)) throw new ServiceError(404, 'Assignment not found.');
    await this.courseService.getOwnedCourse(assignment.courseId, user);
    return { submission, assignment };
  }
  async list(assignmentId, user, query) {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) throw new ServiceError(404, 'Assignment not found.');
    await this.courseService.getOwnedCourse(assignment.courseId, user);
    return this.assignmentSubmissionRepository.findPage(assignmentId, query);
  }
  async detail(id, user) { return (await this.owned(id, user)).submission; }
}
module.exports = AssignmentAssessmentService;
