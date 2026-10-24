const mongoose = require('mongoose');
const { REVIEW_STATUSES } = require('../../domain/engagement/ReviewPolicy');
const reviewSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: REVIEW_STATUSES, default: 'visible', index: true },
  reply: {
    content: { type: String, trim: true, maxlength: 2000 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    repliedAt: Date,
  },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  moderatedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

reviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
Review.REVIEW_STATUSES = REVIEW_STATUSES;
module.exports = Review;
