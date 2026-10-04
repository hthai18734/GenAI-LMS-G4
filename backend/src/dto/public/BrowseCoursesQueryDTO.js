class BrowseCoursesQueryDTO {
  constructor(query = {}) {
    this.query = query;
  }

  validate() {
    const errors = {};
    if (this.query.page !== undefined && this.query.page !== '') {
      const pageNum = Number(this.query.page);
      if (!Number.isInteger(pageNum) || pageNum < 1) {
        errors.page = 'Page must be an integer greater than zero.';
      }
    }
    if (this.query.limit !== undefined && this.query.limit !== '') {
      const limitNum = Number(this.query.limit);
      if (!Number.isInteger(limitNum) || limitNum < 1) {
        errors.limit = 'Limit must be an integer greater than zero.';
      }
    }
    return errors;
  }

  toObject() {
    return {
      page: Math.max(1, Number(this.query.page) || 1),
      limit: Math.min(Number(this.query.limit) || 10, 100),
    };
  }
}

module.exports = BrowseCoursesQueryDTO;
