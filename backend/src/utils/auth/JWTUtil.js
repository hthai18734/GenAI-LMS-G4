const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTUtil {
  static createAccessToken(user, sessionId = null) {
    return jwt.sign(
      { sub: String(user._id), role: user.role, type: 'access', version: user.tokenVersion || 0, ...(sessionId ? { sid: String(sessionId) } : {}) },
      this.#requiredSecret('JWT_ACCESS_SECRET'),
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
    );
  }

  static verifyAccessToken(token) {
    const payload = jwt.verify(token, this.#requiredSecret('JWT_ACCESS_SECRET'));
    if (payload.type !== 'access') throw new jwt.JsonWebTokenError('Invalid access token type.');
    return payload;
  }

  static createRefreshToken(user, sessionId) {
    return jwt.sign(
      {
        sub: String(user._id),
        sid: String(sessionId),
        version: user.tokenVersion || 0,
        type: 'refresh',
        jti: crypto.randomBytes(24).toString('hex'),
      },
      this.#requiredSecret('JWT_ACCESS_SECRET'),
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );
  }

  static verifyRefreshToken(token) {
    const payload = jwt.verify(token, this.#requiredSecret('JWT_ACCESS_SECRET'));
    if (payload.type !== 'refresh') throw new jwt.JsonWebTokenError('Invalid refresh token type.');
    return payload;
  }

  static createOAuthStateToken(extra = {}) {
    return jwt.sign(
      { nonce: crypto.randomBytes(24).toString('hex'), type: 'oauth_state', ...extra },
      this.#requiredSecret('JWT_ACCESS_SECRET'),
      { expiresIn: '15m' },
    );
  }

  static verifyOAuthStateToken(token) {
    const payload = jwt.verify(token, this.#requiredSecret('JWT_ACCESS_SECRET'));
    if (payload.type !== 'oauth_state') throw new Error('Invalid OAuth state.');
    return payload;
  }

  static #requiredSecret(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required.`);
    return value;
  }
}

module.exports = JWTUtil;
