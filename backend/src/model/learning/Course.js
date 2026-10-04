const mongoose = require('mongoose');
const { COURSE_STATUS, COURSE_STATUSES } = require('./CourseStatus');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, trim: true, lowercase: true, index: true },
    description: { type: String, trim: true, default: '' },
    thumbnail: { type: String, trim: true, default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: COURSE_STATUSES, default: COURSE_STATUS.DRAFT, index: true },
    category: { type: String, trim: true, default: null },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    duration: { type: Number, default: 0 },
    price: { type: Number, default: 0, min: 0 },
    discountPrice: { type: Number, default: null, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalStudents: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    submittedForReviewAt: { type: Date, default: null },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

courseSchema.pre('save', function (next) {
  if (!this.instructorId && this.teacherId) {
    this.instructorId = this.teacherId;
  }
  if (!this.teacherId && this.instructorId) {
    this.teacherId = this.instructorId;
  }
  next();
});

const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
Course.COURSE_STATUSES = COURSE_STATUSES;
Course.COURSE_STATUS = COURSE_STATUS;

module.exports = Course;
