const OtpVerification = require('../../model/identity/OtpVerification');

class OtpVerificationDAO {
  async save({
    email,
    purpose,
    otpHash,
    payload = {},
    otpExpiresAt,
    expiresAt,
    resendAvailableAt,
  }) {
    return OtpVerification.findOneAndUpdate(
      { email: email.toLowerCase(), purpose },
      {
        email: email.toLowerCase(),
        purpose,
        otpHash,
        payload,
        otpExpiresAt,
        expiresAt,
        resendAvailableAt,
        wrongAttempts: 0,
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();
  }

  async find(email, purpose) {
    return OtpVerification.findOne({ email: email.toLowerCase(), purpose }).exec();
  }

  async incrementWrongAttempts(id) {
    return OtpVerification.findByIdAndUpdate(
      id,
      { $inc: { wrongAttempts: 1 } },
      { new: true },
    ).exec();
  }

  async clear(email, purpose) {
    return OtpVerification.deleteOne({ email: email.toLowerCase(), purpose }).exec();
  }
}

module.exports = new OtpVerificationDAO();
