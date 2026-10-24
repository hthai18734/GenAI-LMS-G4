const OtpVerification = require('../../../../../model/identity/OtpVerification');

class OtpVerificationRepository {
  async save({ email, purpose, otpHash, payload = {}, otpExpiresAt, expiresAt, resendAvailableAt }) {
    try {
      const now = new Date();
      return await OtpVerification.findOneAndUpdate(
        {
          email: email.toLowerCase(),
          purpose,
          $or: [
            { resendAvailableAt: { $lte: now } },
            { expiresAt: { $lte: now } },
            { resendAvailableAt: { $exists: false } },
          ],
        },
        { email: email.toLowerCase(), purpose, otpHash, payload, otpExpiresAt, expiresAt, resendAvailableAt, wrongAttempts: 0 },
        { upsert: true, new: true, runValidators: true },
      ).exec();
    } catch (error) {
      if (error.code === 11000) {
        const conflict = new Error('OTP resend cooldown is active.');
        conflict.code = 'OTP_COOLDOWN';
        throw conflict;
      }
      throw error;
    }
  }

  async find(email, purpose) {
    return OtpVerification.findOne({ email: email.toLowerCase(), purpose }).exec();
  }

  async incrementWrongAttempts(id) {
    return OtpVerification.findByIdAndUpdate(id, { $inc: { wrongAttempts: 1 } }, { new: true }).exec();
  }

  async clear(email, purpose) {
    return OtpVerification.deleteOne({ email: email.toLowerCase(), purpose }).exec();
  }
}

module.exports = new OtpVerificationRepository();
