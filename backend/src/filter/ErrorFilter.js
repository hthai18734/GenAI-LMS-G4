const LoggerUtil = require('../utils/common/LoggerUtil');
const ResponseUtil = require('../utils/common/ResponseUtil');

function ErrorFilter(error, req, res, next) { // eslint-disable-line no-unused-vars
  LoggerUtil.error('Unhandled request error', error, { method: req.method, path: req.originalUrl });
  if (res.headersSent) return next(error);
  if (error.code === 'LIMIT_FILE_SIZE') {
    return ResponseUtil.error(res, { status: 400, message: req.path.includes('lesson-video') ? 'Video must not exceed 200 MB.' : req.path.includes('assignment') ? 'Assignment document must not exceed 25 MB.' : 'Image must not exceed 5 MB.' });
  }
  if (error.name === 'MulterError') return ResponseUtil.error(res, { status: 400, message: 'Upload exactly one file using the expected field.' });
  return ResponseUtil.error(res, { status: error.status || 500, message: error.publicMessage || (error.status ? error.message : 'Internal server error.') });
}

module.exports = ErrorFilter;
