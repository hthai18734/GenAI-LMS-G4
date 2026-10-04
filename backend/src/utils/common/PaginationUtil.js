class PaginationUtil {
  /**
   * Parse and calculate pagination parameters
   * @param {number|string} page 
   * @param {number|string} limit 
   * @returns {{ page: number, limit: number, skip: number }}
   */
  static getPagination(page = 1, limit = 10) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    return {
      page: parsedPage,
      limit: parsedLimit,
      skip,
    };
  }

  /**
   * Format standard paginated response payload
   * @param {Array} data 
   * @param {number} total 
   * @param {number} page 
   * @param {number} limit 
   * @returns {Object}
   */
  static formatPaginatedResponse(data = [], total = 0, page = 1, limit = 10) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return {
      items: data,
      courses: data, // Alias for Course browsing backwards compatibility
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1,
      },
    };
  }
}

module.exports = PaginationUtil;
