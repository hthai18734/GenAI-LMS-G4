const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { ISSUE_TYPES } = require('../../domain/learning/LearningContentReportPolicy');
const ServiceError = require('../common/ServiceError');

class LearningContentReportService {
  constructor({ learningContentReportRepository, lessonRepository, courseRepository, enrollmentRepository } = {}) {
    this.learningContentReportRepository = learningContentReportRepository;
    this.lessonRepository = lessonRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  // ─── I3-07: Report Learning Content Issue ─────────────────────────
  async reportIssue(user, payload) {
    const { lessonId, materialId = null, issueType, description } = payload;
    this.assertValidId(lessonId, 'Lesson ID');
    if (materialId) this.assertValidId(materialId, 'Material ID');

    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.deletedAt) throw new ServiceError(404, 'Lesson not found.');

    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, lesson.courseId);
    if (!enrollment) {
      throw new ServiceError(403, 'You must be enrolled in this course to report a content issue.');
    }

    if (!ISSUE_TYPES.includes(issueType)) {
      throw new ServiceError(422, `Invalid issueType. Allowed types: ${ISSUE_TYPES.join(', ')}.`);
    }

    const desc = (description || '').trim();
    if (!desc) throw new ServiceError(422, 'Description is required.');
    if (desc.length > 3000) throw new ServiceError(422, 'Description must not exceed 3000 characters.');

    const report = await this.learningContentReportRepository.create({
      reporterId: user._id,
      courseId: lesson.courseId,
      lessonId: lesson._id,
      materialId: materialId || null,
      issueType,
      description: desc,
      status: 'OPEN',
    });

    const populated = await this.learningContentReportRepository.findById(report._id);
    return this.toReportDTO(populated);
  }

  async listMyReports(user, { page = 1, limit = 15 } = {}) {
    const result = await this.learningContentReportRepository.findByReporter(user._id, { page, limit });
    return {
      reports: result.items.map((r) => this.toReportDTO(r)),
      pagination: {
        page: Math.max(1, page),
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    };
  }

  // ─── I3-08: Resolve Learning Content Report ───────────────────────
  async listReportsForTeacher(teacherUser, { status, courseId, page = 1, limit = 15 } = {}) {
    // Find courses owned by teacher
    const courses = await this.courseRepository.findByTeacherId(teacherUser._id);
    const courseIds = courses.map((c) => c._id);

    if (courseIds.length === 0) {
      return { reports: [], pagination: { page: 1, limit, total: 0, totalPages: 1 } };
    }

    const result = await this.learningContentReportRepository.findByCourses(courseIds, { status, courseId, page, limit });
    return {
      reports: result.items.map((r) => this.toReportDTO(r)),
      pagination: {
        page: Math.max(1, page),
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    };
  }

  async getReportDetail(reportId, user) {
    this.assertValidId(reportId, 'Report ID');
    const report = await this.learningContentReportRepository.findById(reportId);
    if (!report) throw new ServiceError(404, 'Report not found.');

    const isReporter = String(report.reporterId?._id || report.reporterId) === String(user._id);
    const course = report.courseId;
    const isTeacher = course && (String(course.teacherId) === String(user._id) || String(course.instructorId) === String(user._id));

    if (!isReporter && !isTeacher) {
      throw new ServiceError(403, 'You do not have permission to view this report.');
    }

    return this.toReportDTO(report);
  }

  async resolveReport(reportId, teacherUser, payload) {
    this.assertValidId(reportId, 'Report ID');
    const report = await this.learningContentReportRepository.findById(reportId);
    if (!report) throw new ServiceError(404, 'Report not found.');

    const course = report.courseId;
    const isTeacher = course && (String(course.teacherId) === String(teacherUser._id) || String(course.instructorId) === String(teacherUser._id));
    if (!isTeacher) {
      throw new ServiceError(403, 'You do not have permission to resolve reports for this course.');
    }

    const { status, resolutionNote } = payload;
    if (!['RESOLVED', 'REJECTED', 'IN_REVIEW'].includes(status)) {
      throw new ServiceError(422, 'Status must be one of IN_REVIEW, RESOLVED, REJECTED.');
    }

    const note = (resolutionNote || '').trim();
    if (['RESOLVED', 'REJECTED'].includes(status) && !note) {
      throw new ServiceError(422, 'Resolution note is required when resolving or rejecting an issue report.');
    }

    const updated = await this.learningContentReportRepository.updateStatus(reportId, {
      status,
      resolvedBy: teacherUser._id,
      resolutionNote: note,
    });

    return this.toReportDTO(updated);
  }

  toReportDTO(report) {
    const r = typeof report.toObject === 'function' ? report.toObject() : report;
    return {
      id: String(r._id),
      reporter: {
        id: String(r.reporterId?._id || r.reporterId),
        fullName: r.reporterId?.fullName || 'Student',
        email: r.reporterId?.email || '',
      },
      course: {
        id: String(r.courseId?._id || r.courseId),
        title: r.courseId?.title || 'Course',
      },
      lesson: {
        id: String(r.lessonId?._id || r.lessonId),
        title: r.lessonId?.title || 'Lesson',
        order: r.lessonId?.order || 1,
      },
      material: r.materialId ? {
        id: String(r.materialId?._id || r.materialId),
        name: r.materialId?.name || 'Material',
      } : null,
      issueType: r.issueType,
      description: r.description,
      status: r.status,
      resolutionNote: r.resolutionNote,
      resolvedBy: r.resolvedBy ? String(r.resolvedBy) : null,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}

module.exports = LearningContentReportService;
