const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validatePassword } = require('../../domain/identity/PasswordPolicy');

const SALT_ROUNDS = 12;

class PasswordUtil {
  static async hash(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async compare(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }

  static validate(password) {
    return validatePassword(password);
  }

  static generateTemporaryPassword(length = 14) {
    const raw = crypto.randomBytes(length * 2).toString('base64url');
    return `Aa1!${raw}`.slice(0, Math.max(8, length));
  }
}

module.exports = PasswordUtil;
