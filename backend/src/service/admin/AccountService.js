const PasswordUtil = require('../../utils/auth/PasswordUtil');
const PaginationUtil = require('../../utils/common/PaginationUtil');
const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

class AccountService {
  constructor({ userRepository, refreshSessionRepository } = {}) {
    this.userRepository = userRepository;
    this.refreshSessionRepository = refreshSessionRepository;
  }
  assertId(id) { if (!isValidIdentifier(id)) throw new ServiceError(400, 'User ID is invalid.'); }
  async list(paging) {
    const [users, total] = await Promise.all([this.userRepository.findAccounts(paging), this.userRepository.countAccounts(paging)]);
    return { users, pagination: PaginationUtil.formatPaginatedResponse(users, total, paging.page, paging.limit).pagination };
  }
  async getById(userId) {
    this.assertId(userId);
    const user = await this.userRepository.findById(userId);
    if (!user) throw new ServiceError(404, 'User not found.');
    return { user };
  }
  async create(data, password) {
    if (await this.userRepository.isEmailExists(data.email)) throw new ServiceError(409, 'This email is already in use.');
    try {
      const created = await this.userRepository.createUser({ ...data, passwordHash: await PasswordUtil.hash(password) });
      return { user: await this.userRepository.findById(created._id) };
    } catch (error) {
      if (error.code === 11000) throw new ServiceError(409, 'This email is already in use.');
      throw error;
    }
  }
  async update(userId, data) {
    this.assertId(userId);
    const current = await this.userRepository.findById(userId);
    if (!current) throw new ServiceError(404, 'User not found.');
    if (data.email && data.email !== current.email && await this.userRepository.isEmailExists(data.email)) throw new ServiceError(409, 'This email is already in use.');
    const emailChanged = Boolean(data.email && data.email !== current.email);
    if (emailChanged) data = { ...data, emailVerifiedAt: null };
    try {
      const user = await this.userRepository.updateUser(current._id, data, { invalidateSession: emailChanged });
      if (!user) throw new ServiceError(404, 'User not found.');
      if (emailChanged) await this.refreshSessionRepository.removeByUser(user._id);
      return { user };
    } catch (error) {
      if (error.code === 11000) throw new ServiceError(409, 'This email is already in use.');
      throw error;
    }
  }
  async remove(userId, actor) {
    this.assertId(userId);
    if (String(actor._id) === userId) throw new ServiceError(403, 'You cannot delete your own account.');
    const user = await this.userRepository.deleteUser(userId);
    if (!user) throw new ServiceError(404, 'User not found.');
    await this.refreshSessionRepository.removeByUser(user._id);
  }
  async updateRole(userId, role, actor) {
    this.assertId(userId);
    if (String(actor._id) === userId && role !== actor.role) throw new ServiceError(403, 'You cannot change your own role.');
    const user = await this.userRepository.updateRole(userId, role, { invalidateSession: true });
    if (!user) throw new ServiceError(404, 'User not found.');
    await this.refreshSessionRepository.removeByUser(user._id);
    return { user };
  }
  async updateStatus(userId, status) {
    this.assertId(userId);
    const user = await this.userRepository.findById(userId);
    if (!user) throw new ServiceError(404, 'User not found.');
    if (user.role === 'admin') throw new ServiceError(403, 'Admin accounts cannot be locked or unlocked here.');
    if (user.status === 'pending') throw new ServiceError(409, 'Pending accounts must complete email verification.');
    const updated = await this.userRepository.updateStatus(user._id, status);
    if (!updated) throw new ServiceError(404, 'User not found.');
    await this.refreshSessionRepository.removeByUser(user._id);
    return { user: { id: String(updated._id), fullName: updated.fullName, email: updated.email, role: updated.role, status: updated.status } };
  }
}
module.exports = AccountService;
