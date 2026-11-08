const mongoose = require('mongoose');
const LearningContentReport = require('../../../../../model/learning/LearningContentReport');

class LearningContentReportRepository {
  async create(data) {
    return LearningContentReport.create(data);
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return LearningContentReport.findById(id)
      .populate('reporterId', 'fullName email avatar')
      .populate('courseId', 'title teacherId instructorId')
      .populate('lessonId', 'title order')
      .populate('materialId', 'name mimeType')
      .exec();
  }

  async findByReporter(reporterId, { page = 1, limit = 15 } = {}) {
    if (!mongoose.isValidObjectId(reporterId)) return { items: [], total: 0 };
    const filter = { reporterId };
    const skip = (Math.max(1, page) - 1) * limit;

    const [items, total] = await Promise.all([
      LearningContentReport.find(filter)
        .populate('courseId', 'title')
        .populate('lessonId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      LearningContentReport.countDocuments(filter),
    ]);

    return { items, total };
  }

  async findByCourses(courseIds, { status, courseId, page = 1, limit = 15 } = {}) {
    const scopedCourseIds = courseId && mongoose.isValidObjectId(courseId)
      ? courseIds.filter((ownedId) => String(ownedId) === String(courseId))
      : courseIds;
    const filter = { courseId: { $in: scopedCourseIds } };
    if (status) {
      filter.status = status;
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [items, total] = await Promise.all([
      LearningContentReport.find(filter)
        .populate('reporterId', 'fullName email avatar')
        .populate('courseId', 'title')
        .populate('lessonId', 'title order')
        .populate('materialId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      LearningContentReport.countDocuments(filter),
    ]);

    return { items, total };
  }

  async updateStatus(id, { status, resolvedBy, resolutionNote }) {
    if (!mongoose.isValidObjectId(id)) return null;
    return LearningContentReport.findByIdAndUpdate(
      id,
      {
        status,
        resolvedBy,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(status) ? new Date() : null,
        resolutionNote,
      },
      { new: true }
    )
      .populate('reporterId', 'fullName email')
      .populate('courseId', 'title')
      .populate('lessonId', 'title')
      .exec();
  }
}

module.exports = new LearningContentReportRepository();
