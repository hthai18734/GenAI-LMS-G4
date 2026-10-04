/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Search Courses Query DTO for Guest Public Courses (UC-1.3)
 */
const { text } = require('../common/DTOUtil');

class SearchCoursesQueryDTO {
  constructor(query = {}) {
    this.query = query;
    this.keyword = text(query.q !== undefined ? query.q : query.keyword);
  }

  validate() {
    const errors = {};
    if (!this.keyword || this.keyword.length === 0) {
      errors.keyword = 'Keyword required';
    } else if (this.keyword.length < 2) {
      errors.keyword = 'Keyword must be at least 2 characters long';
    }

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
      keyword: this.keyword,
      page: Math.max(1, Number(this.query.page) || 1),
      limit: Math.min(Number(this.query.limit) || 10, 100),
    };
  }
}

module.exports = SearchCoursesQueryDTO;
