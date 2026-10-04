const mongoose = require('mongoose');
const User = require('../../model/identity/User');

class UserDAO {
  async isEmailExists(email) {
    return Boolean(await User.exists({ email: email.toLowerCase() }));
  }

  async createUser(data) {
    return User.create(data);
  }

  async findByEmail(email, { includePassword = false } = {}) {
    let query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) query = query.select('+passwordHash');
    return query.exec();
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return User.findById(id).exec();
  }

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
    return User.findOne({ _id: teacherId, role: 'teacher' })
      .select('fullName avatar bio role email createdAt')
      .exec();
  }

  async updateRole(userId, role) {
    if (!mongoose.isValidObjectId(userId)) return null;
    return User.findByIdAndUpdate(userId, { role }, { new: true, runValidators: true }).exec();
  }

  async findTopTeachers(limit = 4) {
    return User.find({ role: 'teacher', status: 'active' })
      .select('fullName avatar bio role email')
      .limit(limit)
      .exec();
  }
}

module.exports = new UserDAO();
