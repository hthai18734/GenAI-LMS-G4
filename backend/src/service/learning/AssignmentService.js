const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

class AssignmentService {
  constructor({ assignmentRepository, lessonRepository, enrollmentRepository, courseRepository, assignmentSubmissionRepository, courseService, progressTrackingService, clock = () => new Date() } = {}) {
    this.clock = clock;
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
    this.assertScale(data);
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
    const contentChange = ['title', 'content', 'lessonId', 'attachment'].some(key => Object.hasOwn(input, key));
    const { assignment, course } = await this.getOwnedAssignment(assignmentId, user, { requireEditable: contentChange });
    const data = { ...input };
    this.assertScale({ ...assignment, ...data });
    if (['maxScore', 'passingScore'].some(key => Object.hasOwn(data, key) && data[key] !== assignment[key])
      && await this.assignmentSubmissionRepository.hasNumericGrades(assignmentId)) throw new ServiceError(409, 'A graded assessment scale cannot be changed.');
    for (const key of ['maxScore', 'passingScore']) if (Object.hasOwn(data, key) && data[key] === (assignment[key] ?? null)) delete data[key];
    if (data.lessonId) {
      const lesson = await this.lessonRepository.findById(data.lessonId);
      if (!lesson || String(lesson.courseId) !== String(course._id)) throw new ServiceError(404, 'Lesson not found.');
    }
    const scaleChange = ['maxScore', 'passingScore'].some(key => Object.hasOwn(data, key));
    const updated = await this.assignmentRepository.update(assignment._id, data, scaleChange ? { maxScore: assignment.maxScore ?? null, passingScore: assignment.passingScore ?? null } : undefined);
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

  async assertCanSubmit(assignmentId, user) {
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
    const submittedAt = this.clock();
    if (assignment.deadline && submittedAt >= new Date(assignment.deadline)) throw new ServiceError(409, 'The assignment deadline has passed.');
    return { assignment, submittedAt };
  }

  async submitAssignment(assignmentId, user, answer, attachment, revision) {
    const { assignment, submittedAt } = await this.assertCanSubmit(assignmentId, user);
    if (typeof answer !== 'string' || (!answer.trim() && !attachment) || answer.trim().length > 10000) throw new ServiceError(400, 'Enter an answer (up to 10000 characters) or attach a PDF/Word file.');
    if (revision !== undefined && (!Number.isInteger(revision) || revision < 0)) throw new ServiceError(400, 'Invalid submission revision.');
    const submission = await this.assignmentSubmissionRepository.submit(assignment._id, assignment.courseId, user._id, answer.trim(), submittedAt, attachment || null, revision);
    if (!submission) throw new ServiceError(409, 'Your submission changed. Reload before submitting again.');
    if (this.progressTrackingService) {
      await this.progressTrackingService.recalculateCourseProgress(user._id, assignment.courseId);
    }
    return submission;
  }

  assertScale(data) {
    if (data.passingScore != null && (!(data.maxScore > 0) || data.passingScore > data.maxScore)) throw new ServiceError(400, 'Passing score requires a maximum score and must be within its scale.');
  }

}

module.exports = AssignmentService;
