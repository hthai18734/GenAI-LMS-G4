const mongoose = require('mongoose');
const User = require('../../../../../model/identity/User');

class UserRepository {
  accountFilter(criteria = {}) {
    const filter = {};
    const search = String(criteria.search || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (search) filter.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (criteria.role) filter.role = criteria.role;
    if (criteria.status) filter.status = criteria.status;
    if (criteria.teachingStatus === 'suspended') filter.teachingStatus = 'suspended';
    if (criteria.teachingStatus === 'active') filter.teachingStatus = { $ne: 'suspended' };
    return filter;
  }
  async findTeachers({ skip, limit, ...criteria }) {
    return User.find({ ...this.accountFilter(criteria), role: 'teacher' }).select('fullName email phone avatar role status teachingStatus createdAt updatedAt').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec();
  }

  async findTeacherById(id) {
    return User.findOne({ _id: id, role: 'teacher' }).select('fullName email phone avatar role status teachingStatus createdAt updatedAt').exec();
  }

  async suspendTeaching(id) {
    return User.findOneAndUpdate({ _id: id, role: 'teacher' }, { $set: { teachingStatus: 'suspended' } }, { new: true, runValidators: true })
      .select('fullName email phone avatar role status teachingStatus createdAt updatedAt').exec();
  }
  async unsuspendTeaching(id) {
    return User.findOneAndUpdate({ _id: id, role: 'teacher' }, { $set: { teachingStatus: 'active' } }, { new: true, runValidators: true })
      .select('fullName email phone avatar role status teachingStatus createdAt updatedAt').exec();
  }
  async isEmailExists(email) {
    return Boolean(await User.exists({ email: email.toLowerCase() }));
  }

  async createUser(data) {
    return User.create(data);
  }

  async verifyEmail(id, email) {
    return User.findOneAndUpdate({ _id: id, email, status: { $in: ['pending', 'active'] }, emailVerifiedAt: null }, {
      $set: { emailVerifiedAt: new Date(), status: 'active' },
    }, { new: true, runValidators: true }).exec();
  }

  async findByEmail(email, { includePassword = false } = {}) {
    let query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) query = query.select('+passwordHash');
    return query.exec();
  }

  async findById(id, { includePassword = false } = {}) {
    if (!mongoose.isValidObjectId(id)) return null;
    let query = User.findById(id);
    if (includePassword) query = query.select('+passwordHash');
    return query.exec();
  }

  async savePasswordReset(id, tokenHash, email) {
    const now = new Date();
    return User.findOneAndUpdate({ _id: id, status: 'active', ...(email ? { email } : {}), $or: [
      { passwordResetRequestedAt: null },
      { passwordResetRequestedAt: { $lte: new Date(now.getTime() - 60_000) } },
    ] }, { passwordResetHash: tokenHash, passwordResetExpiresAt: new Date(now.getTime() + 30 * 60_000), passwordResetRequestedAt: now }, { new: true }).exec();
  }

  async clearPasswordReset(id, tokenHash) {
    return User.updateOne({ _id: id, passwordResetHash: tokenHash }, { $unset: { passwordResetHash: 1, passwordResetExpiresAt: 1, passwordResetRequestedAt: 1 } }).exec();
  }

  async resetPassword(tokenHash, passwordHash) {
    return User.findOneAndUpdate({ passwordResetHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() }, status: 'active' }, {
      $set: { passwordHash }, $inc: { tokenVersion: 1 },
      $unset: { passwordResetHash: 1, passwordResetExpiresAt: 1, passwordResetRequestedAt: 1 },
    }, { new: true, runValidators: true }).exec();
  }

  async changePassword(id, currentHash, passwordHash) {
    return User.findOneAndUpdate({ _id: id, passwordHash: currentHash, status: 'active' }, {
      $set: { passwordHash }, $inc: { tokenVersion: 1 },
      $unset: { passwordResetHash: 1, passwordResetExpiresAt: 1, passwordResetRequestedAt: 1 },
    }, { new: true, runValidators: true }).exec();
  }

  async updateStatus(id, status) {
    return User.findOneAndUpdate({ _id: id, role: { $ne: 'admin' }, status: { $in: ['active', 'inactive'] } }, { $set: { status }, $inc: { tokenVersion: 1 },
      $unset: { passwordResetHash: 1, passwordResetExpiresAt: 1, passwordResetRequestedAt: 1 },
    }, { new: true, runValidators: true }).exec();
  }

  async findAccounts({ skip, limit, ...criteria }) {
    return User.find(this.accountFilter(criteria)).select('fullName email role status createdAt').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec();
  }

  async countAccounts(criteria = {}) { return User.countDocuments(this.accountFilter(criteria)).exec(); }

  async countByRole(role) { return User.countDocuments(role ? { role } : {}).exec(); }

  async findRecent(limit = 6) {
    return User.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('fullName email role status createdAt')
      .exec();
  }

  findActiveVerifiedStudent(id, session = null) {
    return User.findOne({
      _id: id,
      role: 'student',
      status: 'active',
      emailVerifiedAt: { $ne: null },
    }).session(session).lean().exec();
  }

  async updateUser(id, updates, { invalidateSession = false } = {}) {
    const changes = { $set: updates };
    if (invalidateSession) {
      changes.$inc = { tokenVersion: 1 };
      changes.$unset = { passwordResetHash: 1, passwordResetExpiresAt: 1, passwordResetRequestedAt: 1 };
    }
    return User.findByIdAndUpdate(id, changes, { new: true, runValidators: true }).exec();
  }

  async deleteUser(id) { return User.findByIdAndDelete(id).exec(); }

  async recordLoginSuccess(id) {
    return User.findByIdAndUpdate(id, { lastLoginAt: new Date() }, { new: true }).exec();
  }

  async updateProfile(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    const allowed = {};
    if (updates.fullName !== undefined) allowed.fullName = updates.fullName;
    if (updates.phone !== undefined) allowed.phone = updates.phone;
    if (updates.avatar !== undefined) allowed.avatar = updates.avatar;
    return User.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).exec();
  }
  async findTeacherSummaryById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return User.findById(id).select('fullName avatar bio role').exec();
  }

  async findPublicTeacherById(teacherId) {
    if (!mongoose.isValidObjectId(teacherId)) return null;
    return User.findOne({ _id: teacherId, role: 'teacher' }).select('fullName avatar bio role email createdAt').exec();
  }

  async updateRole(userId, role, { invalidateSession = false } = {}) {
    if (!mongoose.isValidObjectId(userId)) return null;
    const updates = { $set: { role } };
    if (invalidateSession) updates.$inc = { tokenVersion: 1 };
    return User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).exec();
  }

  async findTopTeachers(limit = 4) {
    return User.find({ role: 'teacher', status: 'active' })
      .select('fullName avatar bio role email')
      .limit(limit)
      .exec();
}
}

module.exports = new UserRepository();
