const mongoose = require('mongoose');
const Category = require('../../model/content/Category');

class CategoryDAO {
  /**
   * Find all active categories (UC-1.1, UC-1.6)
   */
  async findAllActive() {
    return Category.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Category.findById(id).exec();
  }

  async findBySlug(slug) {
    return Category.findOne({ slug: slug.toLowerCase(), isActive: true }).exec();
  }

  async create(data) {
    return Category.create(data);
  }
}

module.exports = new CategoryDAO();
