const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  mimeType: String, size: Number, text: String,
  data: { type: Buffer, select: false },
}, { timestamps: true, versionKey: false });
schema.index({ ownerId: 1, conversationId: 1 });
module.exports = mongoose.models.ChatDocument || mongoose.model('ChatDocument', schema);
