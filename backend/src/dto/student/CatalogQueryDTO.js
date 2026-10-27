/**
Author: ThienDDN - CE182101
Created at: 01/10/2026
Description: Student Course Catalog Query
 */
const { isObjectPayload, strictInteger } = require('../common/DTOUtil');

class CatalogQueryDTO {
  constructor(query = {}) {
    this.payloadIsObject = isObjectPayload(query);
    this.query = this.payloadIsObject ? query : {};
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Query parameters must be an object.';
    if (this.query.page !== undefined && strictInteger(this.query.page, { min: 1, max: 1000000 }) === null) {
      errors.page = 'Page must be an integer greater than zero.';
    }
    if (this.query.limit !== undefined && strictInteger(this.query.limit, { min: 1, max: 100 }) === null) {
      errors.limit = 'Limit must be an integer greater than zero.';
    }
    if (this.query.sortOrder && !['asc', 'desc'].includes(this.query.sortOrder)) {
      errors.sortOrder = 'Sort order must be asc or desc.';
    }
    if (this.query.sortBy && !['createdAt', 'updatedAt', 'title'].includes(this.query.sortBy)) {
      errors.sortBy = 'Sort field is invalid.';
    }
    if (this.query.search !== undefined && (typeof this.query.search !== 'string' || this.query.search.trim().length > 100)) errors.search = 'Search must be a string of at most 100 characters.';
    if (this.query.category !== undefined && (typeof this.query.category !== 'string' || this.query.category.trim().length > 100)) errors.category = 'Category must be a string of at most 100 characters.';
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
