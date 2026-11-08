const JWTUtil = require('../utils/auth/JWTUtil');
const ResponseUtil = require('../utils/common/ResponseUtil');

/**
 * Authentication filter – verifies JWT access token and attaches req.user.
 * Rejects inactive/deactivated users.
 */
function createAuthFilter({ userRepository, refreshSessionRepository, jwtUtil = JWTUtil }) {
  return async function AuthFilter(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return ResponseUtil.error(res, { status: 401, message: 'Please log in to continue.' });
    }

    const payload = jwtUtil.verifyAccessToken(token);

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      return ResponseUtil.error(res, { status: 401, message: 'User not found.' });
    }
    if (user.status !== 'active') {
      return ResponseUtil.error(res, { status: 403, message: 'Your account has been deactivated.' });
    }
    if ((payload.version || 0) !== (user.tokenVersion || 0)
      || (payload.sid && !(await refreshSessionRepository.findActive(payload.sid, user._id)))) {
      return ResponseUtil.error(res, { status: 401, message: 'Session expired. Please sign in again.' });
    }
    if (!user.emailVerifiedAt) return ResponseUtil.error(res, { status: 403, message: 'Please verify your email before logging in.' });

    req.user = user;
    return next();
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      return ResponseUtil.error(res, { status: 401, message: 'Invalid or expired token.' });
    }
    return next(error);
  }
  };
}

/**
 * Role-based authorization filter factory.
 * Usage: RoleFilter('student') or RoleFilter('student', 'admin')
 */
function RoleFilter(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return ResponseUtil.error(res, { status: 401, message: 'Please log in to continue.' });
    }
    if (!roles.includes(req.user.role)) {
      return ResponseUtil.error(res, { status: 403, message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = { createAuthFilter, RoleFilter };
