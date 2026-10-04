const mongoose = require('mongoose');

const oAuthLoginTicketSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, versionKey: false });

module.exports = mongoose.models.OAuthLoginTicket || mongoose.model('OAuthLoginTicket', oAuthLoginTicketSchema);
