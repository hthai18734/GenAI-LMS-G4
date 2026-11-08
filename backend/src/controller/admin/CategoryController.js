module.exports = function createController(UseCases) {
/**
Author: HuyTG - CE182405
Created at: 01/10/2026
Description: Category Management
 */
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { categoryService: CategoryService } = UseCases;
const CreateCategoryDTO = require('../../dto/category/CreateCategoryDTO');
const UpdateCategoryDTO = require('../../dto/category/UpdateCategoryDTO');

class CategoryController {
  validationError(res, errors) { return ResponseUtil.error(res, { status: 400, message: 'Validation failed.', errors }); }
  async create(req, res, next) {
    try {
      const dto = new CreateCategoryDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const category = await CategoryService.createCategory(dto.toObject());
      return ResponseUtil.success(res, { status: 201, message: 'Category created successfully.', data: { category } });
    } catch (error) { return next(error); }
  }
  async list(req, res, next) {
    try { return ResponseUtil.success(res, { data: { categories: await CategoryService.getCategories() } }); } catch (error) { return next(error); }
  }
  async getById(req, res, next) {
    try { return ResponseUtil.success(res, { data: { category: await CategoryService.getCategory(req.params.categoryId) } }); } catch (error) { return next(error); }
  }
  async update(req, res, next) {
    try {
      const dto = new UpdateCategoryDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const category = await CategoryService.updateCategory(req.params.categoryId, dto.toObject());
      return ResponseUtil.success(res, { message: 'Category updated successfully.', data: { category } });
    } catch (error) { return next(error); }
  }
  async remove(req, res, next) {
    try {
      await CategoryService.deleteCategory(req.params.categoryId);
      return ResponseUtil.success(res, { message: 'Category deleted successfully.' });
    } catch (error) { return next(error); }
  }
}
return  new CategoryController();
};
