const mongoose = require('mongoose');
const CategoryDAO = require('../../dao/learning/CategoryDAO');
const CourseDAO = require('../../dao/learning/CourseDAO');
const ServiceError = require('../common/ServiceError');

class CategoryService {
  assertValidId(id) { if (!mongoose.isValidObjectId(id)) throw new ServiceError(400, 'Category ID is invalid.'); }
  normalize(name) { return name.trim().toLocaleLowerCase(); }
  async createCategory(dto) {
    const data = dto.toObject();
    const normalizedName = this.normalize(data.name);
    if (await CategoryDAO.findByNameCaseInsensitive(normalizedName)) throw new ServiceError(409, 'A category with this name already exists.');
    return CategoryDAO.create({ ...data, normalizedName });
  }
  async getCategories() { return CategoryDAO.findAll(); }
  async getActiveCategories() { return CategoryDAO.findAllActive(); }
  async getCategory(categoryId) {
    this.assertValidId(categoryId);
    const category = await CategoryDAO.findById(categoryId);
    if (!category) throw new ServiceError(404, 'Category not found.');
    return category;
  }
  async updateCategory(categoryId, dto) {
    const category = await this.getCategory(categoryId);
    const updates = dto.toObject();
    if (updates.name !== undefined) {
      const normalizedName = this.normalize(updates.name);
      if (await CategoryDAO.findByNameCaseInsensitive(normalizedName, category._id)) throw new ServiceError(409, 'A category with this name already exists.');
      updates.normalizedName = normalizedName;
    }
    const updated = await CategoryDAO.update(categoryId, updates);
    // Preserve the legacy Course.category display field used by existing Student views.
    if (updates.name !== undefined) await CourseDAO.updateCategoryName(categoryId, updates.name);
    return updated;
  }
  async deleteCategory(categoryId) {
    await this.getCategory(categoryId);
    if (await CategoryDAO.isUsedByActiveCourse(categoryId)) throw new ServiceError(409, 'This category is in use by courses and cannot be deleted.');
    return CategoryDAO.softDelete(categoryId);
  }
}
module.exports = new CategoryService();
