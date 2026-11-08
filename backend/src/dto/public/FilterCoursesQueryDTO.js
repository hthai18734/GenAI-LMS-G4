/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Filter & Sort Courses Query DTO for Guest Public Courses (UC-1.4)
 */

const ALLOWED_SORTS = ['newest', 'oldest', 'popular', 'rating', 'price-asc', 'price-desc'];
const { isObjectPayload, strictNumber, strictInteger } = require('../common/DTOUtil');

class FilterCoursesQueryDTO {
  constructor(query = {}) {
    this.payloadIsObject = isObjectPayload(query);
    this.query = this.payloadIsObject ? query : {};
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
    const { minPrice, maxPrice, sort, sortBy } = this.query;

    let min = null;
    let max = null;

    const isPresent = (val) => val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null';

    if (isPresent(minPrice)) {
      min = strictNumber(minPrice);
      if (min === null || min < 0) {
        errors.minPrice = 'Invalid filter options';
      }
    }

    if (isPresent(maxPrice)) {
      max = strictNumber(maxPrice);
      if (max === null || max < 0) {
        errors.maxPrice = 'Invalid filter options';
      }
    }

    if (
      min !== null &&
      max !== null &&
      min > max
    ) {
      errors.priceRange = 'Invalid filter options';
    }

    const rawSort = sortBy || sort;
    if (isPresent(rawSort)) {
      const sortOption = typeof rawSort === 'string' ? rawSort.replace('_', '-') : '';
      if (!ALLOWED_SORTS.includes(sortOption)) {
        errors.sort = 'Invalid filter options';
      }
    }

    if (isPresent(this.query.page)) {
      if (strictInteger(this.query.page, { min: 1, max: 1000000 }) === null) {
        errors.page = 'Page must be an integer greater than zero.';
      }
    }

    if (isPresent(this.query.limit)) {
      if (strictInteger(this.query.limit, { min: 1, max: 100 }) === null) {
        errors.limit = 'Limit must be an integer greater than zero.';
      }
    }
    if (isPresent(this.query.category) && (typeof this.query.category !== 'string' || this.query.category.trim().length > 100)) errors.category = 'Invalid filter options';
    if (isPresent(this.query.categoryId) && (typeof this.query.categoryId !== 'string' || this.query.categoryId.trim().length > 100)) errors.categoryId = 'Invalid filter options';

    return errors;
  }

  toObject() {
    const isPresent = (val) => val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null';

    const rawSort = (isPresent(this.query.sortBy) ? this.query.sortBy : null) ||
      (isPresent(this.query.sort) ? this.query.sort : null) ||
      'newest';
    const normalizedSort = String(rawSort).replace('_', '-');

    const cleanCategory = isPresent(this.query.category) && this.query.category !== 'all'
      ? String(this.query.category).trim()
      : undefined;

    const cleanCategoryId = isPresent(this.query.categoryId) && this.query.categoryId !== 'all'
      ? String(this.query.categoryId).trim()
      : undefined;

    const minPrice = isPresent(this.query.minPrice)
      ? strictNumber(this.query.minPrice)
      : undefined;

    const maxPrice = isPresent(this.query.maxPrice)
      ? strictNumber(this.query.maxPrice)
      : undefined;

    return {
      category: cleanCategory,
      categoryId: cleanCategoryId,
      minPrice,
      maxPrice,
      sortBy: normalizedSort,
      page: Math.max(1, Number(this.query.page) || 1),
      limit: Math.min(Number(this.query.limit) || 10, 100),
    };
  }
}

module.exports = FilterCoursesQueryDTO;
