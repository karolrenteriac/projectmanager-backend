const { PAGINATION_DEFAULTS } = require("../constants");

function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || PAGINATION_DEFAULTS.PAGE);
  const limit = Math.min(
    Math.max(1, parseInt(query.limit) || PAGINATION_DEFAULTS.LIMIT),
    PAGINATION_DEFAULTS.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function createPaginationResult(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}

function createPaginatedResponse(items, total, page, limit) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}

module.exports = {
  getPaginationParams,
  createPaginationResult,
  createPaginatedResponse,
};
