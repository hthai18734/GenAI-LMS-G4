const mongoose = require('mongoose');

const oAuthAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, required: true, lowercase: true, trim: true },
  providerAccountId: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, default: null },
}, { timestamps: true, versionKey: false });

oAuthAccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

module.exports = mongoose.models.OAuthAccount || mongoose.model('OAuthAccount', oAuthAccountSchema);
