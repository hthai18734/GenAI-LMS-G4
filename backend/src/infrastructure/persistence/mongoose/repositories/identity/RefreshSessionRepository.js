const mongoose = require('mongoose');
const crypto = require('crypto');
const RefreshSession = require('../../../../../model/identity/RefreshSession');

class RefreshSessionRepository {
  createId() { return new mongoose.Types.ObjectId(); }
  hash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
  async create(data) { return RefreshSession.create(data); }
  async findActive(id, userId) {
    if (!mongoose.isValidObjectId(id)) return null;
    return RefreshSession.findOne({ _id: id, userId, expiresAt: { $gt: new Date() } }).exec();
  }
  async rotate(id, userId, oldToken, newToken) {
    if (!mongoose.isValidObjectId(id)) return null;
    return RefreshSession.findOneAndUpdate({ _id: id, userId, tokenHash: this.hash(oldToken), expiresAt: { $gt: new Date() } },
      { tokenHash: this.hash(newToken) }, { new: true }).exec();
  }
  async remove(id, userId) {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) return null;
    return RefreshSession.deleteOne({ _id: id, userId }).exec();
  }
  async removeByUser(userId) { return RefreshSession.deleteMany({ userId }).exec(); }
}

module.exports = new RefreshSessionRepository();
