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
  async createAssignment(courseId, user, dto) {
    const course = await this.courseService.getOwnedCourse(courseId, user);
    this.courseService.assertContentEditable(course);
    const data = dto.toObject();
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

  async listAvailableAssignments(courseId, user) {
    const course = await this.courseRepository.findById(courseId);
    if (!course || (course.status !== COURSE_STATUS.PUBLIC && course.status !== COURSE_STATUS.APPROVED)) throw new ServiceError(404, 'Course not found.');
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, courseId);
    if (!enrollment) throw new ServiceError(403, 'You do not have permission to perform this action.');
    return this.assignmentRepository.findByCourseId(courseId);
  }

  async submitAssignment(assignmentId, user, answer) {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) throw new ServiceError(404, 'Assignment not found.');
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, assignment.courseId);
    if (!enrollment) throw new ServiceError(403, 'You do not have permission to perform this action.');
    if (!String(answer || '').trim()) throw new ServiceError(400, 'Assignment answer is required.');
    return this.assignmentSubmissionRepository.submit(assignment._id, assignment.courseId, user._id, String(answer).trim());
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
