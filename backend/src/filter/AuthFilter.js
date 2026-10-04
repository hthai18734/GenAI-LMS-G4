const JWTUtil = require('../utils/auth/JWTUtil');
const UserDAO = require('../dao/identity/UserDAO');
const ResponseUtil = require('../utils/common/ResponseUtil');

async function AuthFilter(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return ResponseUtil.error(res, { status: 401, message: 'Authentication is required.' });
    }

    const token = header.slice(7);
    const payload = JWTUtil.verifyAccessToken(token);

    const user = await UserDAO.findById(payload.sub);
    if (!user) {
      return ResponseUtil.error(res, { status: 401, message: 'User not found.' });
    }
    if (user.status !== 'active') {
      return ResponseUtil.error(res, {
        status: 403,
        message: 'Your account has been deactivated.',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return ResponseUtil.error(res, { status: 401, message: 'Invalid or expired token.' });
    }
    return next(error);
  }
}

function RoleFilter(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return ResponseUtil.error(res, { status: 401, message: 'Authentication is required.' });
    }
    if (!roles.includes(req.user.role)) {
      return ResponseUtil.error(res, {
        status: 403,
        message: 'You do not have permission to access this resource.',
      });
    }
    return next();
  };
}

module.exports = { AuthFilter, RoleFilter };
