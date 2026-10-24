
class CatalogQueryDTO {
  constructor(query = {}) {
    this.query = query;
  }

  validate() {
    const errors = {};
    if (this.query.page !== undefined && (!Number.isInteger(Number(this.query.page)) || Number(this.query.page) < 1)) {
      errors.page = 'Page must be an integer greater than zero.';
    }
    if (this.query.limit !== undefined && (!Number.isInteger(Number(this.query.limit)) || Number(this.query.limit) < 1)) {
      errors.limit = 'Limit must be an integer greater than zero.';
    }
    if (this.query.sortOrder && !['asc', 'desc'].includes(this.query.sortOrder)) {
      errors.sortOrder = 'Sort order must be asc or desc.';
    }
    if (this.query.sortBy && !['createdAt', 'updatedAt', 'title'].includes(this.query.sortBy)) {
      errors.sortBy = 'Sort field is invalid.';
    }
    return errors;
  }

  toObject() {
    return {
      search: typeof this.query.search === 'string' ? this.query.search.trim() : '',
      category: typeof this.query.category === 'string' ? this.query.category.trim() : '',
      page: Number(this.query.page) || 1,
      limit: Math.min(Number(this.query.limit) || 20, 100),
      sortBy: this.query.sortBy || 'updatedAt',
      sortOrder: this.query.sortOrder || 'desc',
    };
  }
}

module.exports = CatalogQueryDTO;
