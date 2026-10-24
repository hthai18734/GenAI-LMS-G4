const mongoose = require('mongoose');

const refreshSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.RefreshSession || mongoose.model('RefreshSession', refreshSessionSchema);
