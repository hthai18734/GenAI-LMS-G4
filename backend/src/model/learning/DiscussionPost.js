const mongoose = require('mongoose');

const discussionPostSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionPost', default: null, index: true },
  title: { type: String, trim: true, maxlength: 200, default: null },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

discussionPostSchema.index({ courseId: 1, parentId: 1, createdAt: -1 });

module.exports = mongoose.models.DiscussionPost || mongoose.model('DiscussionPost', discussionPostSchema);
