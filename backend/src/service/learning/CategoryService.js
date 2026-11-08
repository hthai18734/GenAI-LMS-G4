/**
Author: HuyTG - CE182405
Created at: 01/10/2026
Description: Category Management
 */
const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

class CategoryService {
  constructor({ categoryRepository, courseRepository } = {}) {
    this.categoryRepository = categoryRepository;
    this.courseRepository = courseRepository;
  }
  assertValidId(id) { if (!isValidIdentifier(id)) throw new ServiceError(400, 'Category ID is invalid.'); }
  normalize(name) { return name.trim().toLocaleLowerCase(); }
  async createCategory(input) {
    const data = { ...input };
    const normalizedName = this.normalize(data.name);
    if (await this.categoryRepository.findByNameCaseInsensitive(normalizedName)) throw new ServiceError(409, 'A category with this name already exists.');
    return this.categoryRepository.create({ ...data, normalizedName });
  }
  async getCategories() { return this.categoryRepository.findAll(); }
  async getActiveCategories() { return this.categoryRepository.findAllActive(); }
  async getCategory(categoryId) {
    this.assertValidId(categoryId);
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) throw new ServiceError(404, 'Category not found.');
    return category;
  }
  async updateCategory(categoryId, input) {
    const category = await this.getCategory(categoryId);
    const updates = { ...input };
    if (updates.name !== undefined) {
      const normalizedName = this.normalize(updates.name);
      if (await this.categoryRepository.findByNameCaseInsensitive(normalizedName, category._id)) throw new ServiceError(409, 'A category with this name already exists.');
      updates.normalizedName = normalizedName;
    }
    const updated = await this.categoryRepository.update(categoryId, updates);
    // Preserve the legacy Course.category display field used by existing Student views.
    if (updates.name !== undefined) await this.courseRepository.updateCategoryName(categoryId, updates.name);
    return updated;
  }
  async deleteCategory(categoryId) {
    await this.getCategory(categoryId);
    if (await this.categoryRepository.isUsedByActiveCourse(categoryId)) throw new ServiceError(409, 'This category is in use by courses and cannot be deleted.');
    return this.categoryRepository.softDelete(categoryId);
  }
}
module.exports = CategoryService;
