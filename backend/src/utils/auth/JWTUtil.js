const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTUtil {
  static createAccessToken(user) {
    return jwt.sign(
      { sub: String(user._id), role: user.role, type: 'access' },
      this.#requiredSecret('JWT_ACCESS_SECRET'),
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
    );
  }

  static verifyAccessToken(token) {
    const payload = jwt.verify(token, this.#requiredSecret('JWT_ACCESS_SECRET'));
    if (payload.type !== 'access') throw new Error('Invalid access token type.');
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
