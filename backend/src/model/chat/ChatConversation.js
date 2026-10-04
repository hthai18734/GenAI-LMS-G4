const mongoose = require('mongoose');
const turnSchema = new mongoose.Schema({
  requestId: String, question: String, answer: String, model: String,
  mode: String,
  recommendations: { type: [new mongoose.Schema({ id: String, title: String, reason: String, price: Number, url: String }, { _id: false })], default: undefined },
  studyPlan: { type: mongoose.Schema.Types.Mixed, default: undefined },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });
const schema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'Cuộc trò chuyện mới' },
  courseId: { type: mongoose.Schema.Types.ObjectId, default: null },
  lessonId: { type: mongoose.Schema.Types.ObjectId, default: null },
  turns: { type: [turnSchema], default: [] },
  lockToken: { type: String, default: null },
  lockUntil: { type: Date, default: null },
}, { timestamps: true, versionKey: false });
schema.index({ ownerId: 1, updatedAt: -1 });
module.exports = mongoose.models.ChatConversation || mongoose.model('ChatConversation', schema);
