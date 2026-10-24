const mongoose = require('mongoose');
const TeacherApplication = require('../../../../../model/governance/TeacherApplication');

class TeacherApplicationRepository {
  /**
   * Find application by ID and populate applicant info
   */
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return TeacherApplication.findById(id)
      .populate('userId', 'fullName email avatar bio')
      .populate('reviewedBy', 'fullName email')
      .exec();
  }

  /**
   * Find pending teacher applications
   */
  async findPending() {
    return TeacherApplication.find({ status: 'pending' })
      .populate('userId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find all teacher applications with optional status filter
   */
  async findAll({ status = null } = {}) {
    const filter = {};
    if (status && TeacherApplication.APPLICATION_STATUSES.includes(status)) {
      filter.status = status;
    }
    return TeacherApplication.find(filter)
      .populate('userId', 'fullName email avatar bio')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async countByStatus(status) {
    return TeacherApplication.countDocuments(status ? { status } : {}).exec();
  }

  async findRecent(limit = 5) {
    return TeacherApplication.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'fullName email avatar role status')
      .exec();
  }

  async findLatestByUser(userId) {
    if (!mongoose.isValidObjectId(userId)) return null;
    return TeacherApplication.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'fullName email')
      .exec();
  }

  async findPendingByUser(userId) {
    if (!mongoose.isValidObjectId(userId)) return null;
    return TeacherApplication.findOne({ userId, status: 'pending' }).exec();
  }

  /**
   * Create new teacher application
   */
  async create(data) {
    return TeacherApplication.create(data);
  }

  /**
   * Update status (approve or reject) with reviewer & optional reason
   */
  async updateStatus(id, status, reviewedBy, reason = null) {
    if (!mongoose.isValidObjectId(id)) return null;
    const updates = {
      status,
      reviewedBy,
      reviewedAt: new Date(),
    };
    if (reason !== undefined) {
      updates.rejectReason = reason;
    }

    return TeacherApplication.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('userId', 'fullName email avatar bio')
      .populate('reviewedBy', 'fullName email')
      .exec();
  }
}

module.exports = new TeacherApplicationRepository();
