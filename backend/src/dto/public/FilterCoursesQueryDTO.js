const ALLOWED_SORTS = ['newest', 'oldest', 'popular', 'rating', 'price-asc', 'price-desc'];

class FilterCoursesQueryDTO {
  constructor(query = {}) {
    this.query = query;
  }

  validate() {
    const errors = {};
    const { minPrice, maxPrice, sort, sortBy } = this.query;

    let min = null;
    let max = null;

    const isPresent = (val) =>
      val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null';

    if (isPresent(minPrice)) {
      min = Number(minPrice);
      if (isNaN(min) || min < 0) {
        errors.minPrice = 'Invalid filter options';
      }
    }

    if (isPresent(maxPrice)) {
      max = Number(maxPrice);
      if (isNaN(max) || max < 0) {
        errors.maxPrice = 'Invalid filter options';
      }
    }

    if (min !== null && max !== null && !isNaN(min) && !isNaN(max) && min > max) {
      errors.priceRange = 'Invalid filter options';
    }

    const rawSort = sortBy || sort;
    if (isPresent(rawSort)) {
      const sortOption = String(rawSort).replace('_', '-');
      if (!ALLOWED_SORTS.includes(sortOption)) {
        errors.sort = 'Invalid filter options';
      }
    }

    if (isPresent(this.query.page)) {
      const pageNum = Number(this.query.page);
      if (!Number.isInteger(pageNum) || pageNum < 1) {
        errors.page = 'Page must be an integer greater than zero.';
      }
    }

    if (isPresent(this.query.limit)) {
      const limitNum = Number(this.query.limit);
      if (!Number.isInteger(limitNum) || limitNum < 1) {
        errors.limit = 'Limit must be an integer greater than zero.';
      }
    }

    return errors;
  }

  toObject() {
    const isPresent = (val) =>
      val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null';

    const rawSort =
      (isPresent(this.query.sortBy) ? this.query.sortBy : null) ||
      (isPresent(this.query.sort) ? this.query.sort : null) ||
      'newest';
    const normalizedSort = String(rawSort).replace('_', '-');

    const cleanCategory =
      isPresent(this.query.category) && this.query.category !== 'all'
        ? String(this.query.category).trim()
        : undefined;

    const cleanCategoryId =
      isPresent(this.query.categoryId) && this.query.categoryId !== 'all'
        ? String(this.query.categoryId).trim()
        : undefined;

    const minPrice = isPresent(this.query.minPrice) ? Number(this.query.minPrice) : undefined;

    const maxPrice = isPresent(this.query.maxPrice) ? Number(this.query.maxPrice) : undefined;

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
