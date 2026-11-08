const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, default: '', maxlength: 5000 },
  order: { type: Number, required: true, min: 1 },
  isDefault: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });
schema.index({ courseId: 1, order: 1 });
schema.index({ courseId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });
module.exports = mongoose.models.Section || mongoose.model('Section', schema);
