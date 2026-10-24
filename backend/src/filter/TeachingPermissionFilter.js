const ResponseUtil = require('../utils/common/ResponseUtil');

// AuthFilter loads the current user from MongoDB on every request, including old sessions.
module.exports = function TeachingPermissionFilter(req, res, next) {
  if (req.user?.role === 'teacher' && req.user.teachingStatus === 'suspended') {
    return ResponseUtil.error(res, { status: 403, message: 'Your teaching privileges are suspended. You can still access your account and notifications.' });
  }
  return next();
};
