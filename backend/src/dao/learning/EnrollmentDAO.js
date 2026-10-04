const mongoose = require('mongoose');
const Enrollment = require('../../model/learning/Enrollment');

class EnrollmentDAO {
  async findActiveEnrollment(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    return Enrollment.findOne({ userId, courseId, status: 'active' }).exec();
  }

  async createEnrollment(userId, courseId) {
    return Enrollment.create({ userId, courseId, status: 'active', enrolledAt: new Date() });
  }

  async findByUserId(userId) {
    if (!mongoose.isValidObjectId(userId)) return [];
    return Enrollment.find({ userId })
      .populate('courseId')
      .sort({ enrolledAt: -1 })
      .exec();
  }

  async findForResume(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    return Enrollment.findOne({ userId, courseId, status: 'active' })
      .populate('courseId')
      .exec();
  }

  async markCompleted(enrollmentId) {
    return Enrollment.findByIdAndUpdate(enrollmentId, { status: 'completed', completedAt: new Date() }, { new: true });
  }
}

module.exports = new EnrollmentDAO();
