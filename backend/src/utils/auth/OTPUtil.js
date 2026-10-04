const crypto = require('crypto');

class OTPUtil {
  static get OTP_EXPIRE_MS() {
    return (Number(process.env.OTP_EXPIRE_MINUTES) || 5) * 60 * 1000;
  }

  static get RESEND_COOLDOWN_MS() {
    return (Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60) * 1000;
  }

  static get PENDING_EXPIRE_MS() {
    return (Number(process.env.OTP_PENDING_EXPIRE_HOURS) || 24) * 60 * 60 * 1000;
  }

  static get MAX_WRONG_ATTEMPTS() {
    return Number(process.env.OTP_MAX_ATTEMPTS) || 5;
  }

  static generate() {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  static hash(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
  }

  static verify(otp, otpHash) {
    if (!otp || !otpHash) return false;
    const candidate = Buffer.from(this.hash(otp), 'utf8');
    const expected = Buffer.from(otpHash, 'utf8');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  }
}

module.exports = OTPUtil;
