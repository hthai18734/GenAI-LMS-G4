const LoggerUtil = require('../utils/common/LoggerUtil');
const ResponseUtil = require('../utils/common/ResponseUtil');

function ErrorFilter(error, req, res, next) { // eslint-disable-line no-unused-vars
  LoggerUtil.error('Unhandled request error', error, { method: req.method, path: req.originalUrl });
  if (res.headersSent) return next(error);
  if (error.code === 'LIMIT_FILE_SIZE') {
    return ResponseUtil.error(res, { status: 400, message: 'Image must not exceed 5 MB.' });
  }
  return ResponseUtil.error(res, { status: error.status || 500, message: error.publicMessage || (error.status ? error.message : 'Internal server error.') });
}

module.exports = ErrorFilter;
