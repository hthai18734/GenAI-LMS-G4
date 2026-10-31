const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

class AssignmentService {
  constructor({ assignmentRepository, lessonRepository, enrollmentRepository, courseRepository, assignmentSubmissionRepository, courseService, progressTrackingService } = {}) {
    this.assignmentRepository = assignmentRepository;
    this.lessonRepository = lessonRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.courseRepository = courseRepository;
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.courseService = courseService;
    this.progressTrackingService = progressTrackingService;
  }
  async createAssignment(courseId, user, input) {
    const course = await this.courseService.getOwnedCourse(courseId, user);
    this.courseService.assertContentEditable(course);
    const data = { ...input };
    if (data.lessonId) {
      const lesson = await this.lessonRepository.findById(data.lessonId);
      if (!lesson || String(lesson.courseId) !== String(course._id)) throw new ServiceError(404, 'Lesson not found.');
    }
    return this.assignmentRepository.create({ ...data, courseId: course._id });
  }

  async listAssignments(courseId, user) {
    const course = await this.courseService.getOwnedCourse(courseId, user);
    return this.assignmentRepository.findByCourseId(course._id);
  }

  async getOwnedAssignment(assignmentId, user, { requireEditable = false } = {}) {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) throw new ServiceError(404, 'Assignment not found.');
    const course = await this.courseService.getOwnedCourse(assignment.courseId, user);
    if (requireEditable) this.courseService.assertContentEditable(course);
    return { assignment, course };
  }

  async getAssignment(assignmentId, user) {
    const { assignment } = await this.getOwnedAssignment(assignmentId, user);
    return assignment;
  }

  async updateAssignment(assignmentId, user, input) {
    const { assignment, course } = await this.getOwnedAssignment(assignmentId, user, { requireEditable: true });
    const data = { ...input };
    if (data.lessonId) {
      const lesson = await this.lessonRepository.findById(data.lessonId);
      if (!lesson || String(lesson.courseId) !== String(course._id)) throw new ServiceError(404, 'Lesson not found.');
    }
    const updated = await this.assignmentRepository.update(assignment._id, data);
    if (!updated) throw new ServiceError(409, 'The assignment changed while the request was being processed. Please try again.');
    return updated;
  }

  async deleteAssignment(assignmentId, user) {
    const { assignment } = await this.getOwnedAssignment(assignmentId, user, { requireEditable: true });
    const deleted = await this.assignmentRepository.softDelete(assignment._id);
    if (!deleted) throw new ServiceError(409, 'The assignment changed while the request was being processed. Please try again.');
    return deleted;
  }

  async listAvailableAssignments(courseId, user) {
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt || course.status !== COURSE_STATUS.PUBLIC) throw new ServiceError(404, 'Course not found.');
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, courseId);
    if (!enrollment) throw new ServiceError(403, 'You do not have permission to perform this action.');
    const allAssignments = await this.assignmentRepository.findByCourseId(courseId);
    const assignmentVisibility = await Promise.all(allAssignments.map(async (assignment) => {
      if (!assignment.lessonId) return true;
      const lesson = await this.lessonRepository.findById(assignment.lessonId);
      return Boolean(lesson?.isPublished && String(lesson.courseId) === String(courseId));
    }));
    const assignments = allAssignments.filter((_, index) => assignmentVisibility[index]);
    if (!this.assignmentSubmissionRepository || !assignments || !assignments.length) return assignments || [];
    const submissions = await this.assignmentSubmissionRepository.findByStudentAndCourse(user._id, courseId);
    const submissionMap = new Map((submissions || []).map((s) => [String(s.assignmentId), s]));
    return assignments.map((assignment) => {
      const doc = { ...assignment };
      doc.latestSubmission = submissionMap.get(String(assignment._id)) || null;
      return doc;
    });
  }

  async submitAssignment(assignmentId, user, answer) {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) throw new ServiceError(404, 'Assignment not found.');
    const course = await this.courseRepository.findById(assignment.courseId);
    if (!course || course.deletedAt || course.status !== COURSE_STATUS.PUBLIC) throw new ServiceError(404, 'Assignment not found.');
    if (assignment.lessonId) {
      const lesson = await this.lessonRepository.findById(assignment.lessonId);
      if (!lesson?.isPublished || String(lesson.courseId) !== String(assignment.courseId)) {
        throw new ServiceError(404, 'Assignment not found.');
      }
    }
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, assignment.courseId);
    if (!enrollment) throw new ServiceError(403, 'You do not have permission to perform this action.');
    if (!String(answer || '').trim()) throw new ServiceError(400, 'Assignment answer is required.');
    const submission = await this.assignmentSubmissionRepository.submit(assignment._id, assignment.courseId, user._id, String(answer).trim());
    if (this.progressTrackingService) {
      await this.progressTrackingService.recalculateCourseProgress(user._id, assignment.courseId);
    }
    return submission;
  }

  async gradeSubmission(submissionId, user, passed, feedback) {
    const submission = await this.assignmentSubmissionRepository.findById(submissionId);
    if (!submission) throw new ServiceError(404, 'Assignment submission not found.');
    const assignment = await this.assignmentRepository.findById(submission.assignmentId);
    if (!assignment) throw new ServiceError(404, 'Assignment not found.');
    await this.courseService.getOwnedCourse(assignment.courseId, user);
    const updated = await this.assignmentSubmissionRepository.grade(submission._id, user._id, passed ? 'passed' : 'needs_revision', feedback);
    await this.progressTrackingService.recalculateCourseProgress(submission.studentId, assignment.courseId);
    return updated;
  }
}

module.exports = AssignmentService;
