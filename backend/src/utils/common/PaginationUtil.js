class PaginationUtil {
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

  static formatPaginatedResponse(data = [], total = 0, page = 1, limit = 10) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return {
      items: data,
      courses: data,
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
