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
  async persistAssessment(submission, input, changes) {
    if (input.revision !== undefined && input.revision !== (submission.revision || 0)) throw new ServiceError(409, 'Submission changed. Reload before saving.');
    const updated = await this.assignmentSubmissionRepository.assess(submission._id, submission.revision || 0, changes);
    if (!updated) throw new ServiceError(409, 'Submission changed. Reload before saving.');
    return updated;
  }
  async grade(id, user, input) {
    const { submission, assignment } = await this.owned(id, user);
    const changes = { gradedAt: new Date(), gradedBy: user._id };
    if (Object.hasOwn(input, 'score')) {
      if (!(assignment.maxScore > 0)) throw new ServiceError(409, 'Configure the assignment maximum score before numerical grading.');
      if (typeof input.score !== 'number' || !Number.isFinite(input.score) || input.score < 0 || input.score > assignment.maxScore) throw new ServiceError(400, 'Score is outside the assessment scale.');
      changes.score = input.score; changes.maxScore = assignment.maxScore;
      changes.status = assignment.passingScore == null ? 'graded' : input.score >= assignment.passingScore ? 'passed' : 'needs_revision';
      if (input.revision !== undefined && input.revision !== (submission.revision || 0)) throw new ServiceError(409, 'Submission changed. Reload before saving.');
      if (!await this.assignmentRepository.lockScale(assignment._id, assignment.maxScore, assignment.passingScore)) throw new ServiceError(409, 'Assessment scale changed. Reload before grading.');
    } else {
      if (assignment.maxScore != null || typeof input.passed !== 'boolean') throw new ServiceError(400, 'A numerical score is required for this assessment.');
      changes.status = input.passed ? 'passed' : 'needs_revision';
    }
    if (input.feedback !== undefined) Object.assign(changes, this.feedbackChanges(input.feedback, user));
    const result = await this.persistAssessment(submission, input, changes);
    await this.progressTrackingService.recalculateCourseProgress(submission.studentId, assignment.courseId);
    return result;
  }
  feedbackChanges(feedback, user) {
    if (typeof feedback !== 'string' || feedback.trim().length > 10000) throw new ServiceError(400, 'Feedback must be text up to 10000 characters.');
    return { feedback: feedback.trim(), feedbackAt: new Date(), feedbackBy: user._id };
  }
}
module.exports = AssignmentAssessmentService;
