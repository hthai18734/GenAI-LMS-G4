/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Homepage Query DTO for Guest Public Courses (UC-1.1)
 */

class HomepageQueryDTO {
  constructor(query = {}) {
    this.query = query;
  }

  validate() {
    const errors = {};
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
      limit: Math.min(Number(this.query.limit) || 6, 50),
    };
  }
}

module.exports = HomepageQueryDTO;
