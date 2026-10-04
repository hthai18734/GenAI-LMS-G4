const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  normalizedName: { type: String, required: true },
  description: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true, index: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false });

// A deleted category may be recreated, while live category names remain unique.
categorySchema.index({ normalizedName: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
