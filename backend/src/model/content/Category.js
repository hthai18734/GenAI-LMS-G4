const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
    slug: { type: String, trim: true, lowercase: true, index: true },
    description: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-');
  }
  next();
});

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

module.exports = Category;
