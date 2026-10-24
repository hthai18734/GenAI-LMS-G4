const ResponseUtil = require('../../utils/common/ResponseUtil');

function handleError(res, next, error) {
  if (error?.status && error?.publicMessage) {
    return ResponseUtil.error(res, { status: error.status, message: error.publicMessage, errors: error.errors });
  }
  return next(error);
}

module.exports = { handleError };
