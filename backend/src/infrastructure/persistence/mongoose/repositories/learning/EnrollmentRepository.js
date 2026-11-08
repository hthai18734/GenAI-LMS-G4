const mongoose = require('mongoose');
require('../../../../../model/learning/Course');
const Enrollment = require('../../../../../model/learning/Enrollment');
const { COURSE_STATUS } = require('../../../../../domain/learning/CourseStatus');

class EnrollmentRepository {
  async findActiveEnrollment(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    const enrollment = await Enrollment.findOne({ userId, courseId, status: { $in: ['active', 'completed'] } }).populate('courseId').exec();
    if (!enrollment || (enrollment.courseId && enrollment.courseId.deletedAt)) return null;
    return enrollment;
  }

  async findAccessibleEnrollment(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    const enrollment = await Enrollment.findOne({ userId, courseId, status: { $in: ['active', 'completed'] } }).populate('courseId').exec();
    if (!enrollment?.courseId || enrollment.courseId.deletedAt || enrollment.courseId.status !== COURSE_STATUS.PUBLIC) return null;
    return enrollment;
  }

  async createEnrollment(userId, courseId) {
    return Enrollment.create({ userId, courseId, status: 'active', enrolledAt: new Date() });
  }

  async findByUserId(userId) {
    if (!mongoose.isValidObjectId(userId)) return [];
    const enrollments = await Enrollment.find({ userId, status: { $in: ['active', 'completed'] } })
      .populate('courseId')
      .sort({ completedAt: -1, enrolledAt: -1 })
      .exec();

    const seen = new Set();
    const unique = [];
    for (const e of enrollments) {
      if (!e.courseId || !e.courseId._id || e.courseId.deletedAt) continue;
      const cId = String(e.courseId._id);
      if (!seen.has(cId)) {
        seen.add(cId);
        unique.push(e);
      }
    }
    return unique;
  }

  async findForResume(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    const enrollment = await Enrollment.findOne({ userId, courseId, status: { $in: ['active', 'completed'] } })
      .populate('courseId')
      .exec();
    if (!enrollment?.courseId || enrollment.courseId.deletedAt || enrollment.courseId.status !== COURSE_STATUS.PUBLIC) return null;
    return enrollment;
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Enrollment.findById(id).populate('courseId').exec();
  }

  async findOwned(id, userId) {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) return null;
    return Enrollment.findOne({ _id: id, userId }).populate('courseId').exec();
  }

  async cancelEnrollment(enrollmentId) {
    return Enrollment.findByIdAndUpdate(
      enrollmentId,
      { status: 'cancelled', cancelledAt: new Date() },
      { new: true }
    );
  }

  async markCompleted(enrollmentId) {
    return Enrollment.findByIdAndUpdate(enrollmentId, { status: 'completed', completedAt: new Date() }, { new: true });
  }

  async findRecentByCourseIds(courseIds, limit = 6) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) return [];
    return Enrollment.find({ courseId: { $in: courseIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'fullName email avatar')
      .populate('courseId', 'title category')
      .exec();
  }

  async countByCourseIdsAndStatus(courseIds, status) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) return 0;
    return Enrollment.countDocuments({ courseId: { $in: courseIds }, status }).exec();
  }
}

module.exports = new EnrollmentRepository();
