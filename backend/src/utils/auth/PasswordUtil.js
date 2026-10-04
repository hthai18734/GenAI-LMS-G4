const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

class PasswordUtil {
  static async hash(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async compare(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }

  static validate(password) {
    if (!password) return 'Password is required.';
    if (password.length < 8 || password.length > 15) return 'Password must be 8–15 characters long.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      return 'Password must contain at least one special character.';
    }
    return null;
  }

  static generateTemporaryPassword(length = 14) {
    const raw = crypto.randomBytes(length * 2).toString('base64url');
    return `Aa1!${raw}`.slice(0, Math.max(8, length));
  }
}

module.exports = PasswordUtil;
