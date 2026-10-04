const test = require('node:test');
const assert = require('node:assert/strict');
const AuthController = require('../../src/controller/auth/AuthController');
const OtpVerificationDAO = require('../../src/dao/identity/OtpVerificationDAO');
const OTPUtil = require('../../src/utils/auth/OTPUtil');
const EmailUtil = require('../../src/utils/email/EmailUtil');

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function withoutNextError(action) {
  let nextError;
  await action((error) => { nextError = error; });
  assert.equal(nextError, undefined);
}

test('expired OTP remains available for resend and returns the UC message', async () => {
  const originalFind = OtpVerificationDAO.find;
  const originalClear = OtpVerificationDAO.clear;
  let clearCalled = false;
  OtpVerificationDAO.find = async () => ({
    _id: 'otp-id',
    otpExpiresAt: new Date(Date.now() - 1000),
    expiresAt: new Date(Date.now() + 60_000),
    wrongAttempts: 0,
    payload: { email: 'minh@example.com' },
  });
  OtpVerificationDAO.clear = async () => { clearCalled = true; };

  try {
    const res = response();
    await withoutNextError((next) => AuthController.verifyOtp(
      { body: { email: 'minh@example.com', otp: '123456' } }, res, next,
    ));
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'The OTP has expired. Select "Resend Code" to receive a new one.');
    assert.equal(clearCalled, false);
  } finally {
    OtpVerificationDAO.find = originalFind;
    OtpVerificationDAO.clear = originalClear;
  }
});

test('incorrect OTP reports remaining attempts and locks only after more than five failures', async () => {
  const originalFind = OtpVerificationDAO.find;
  const originalIncrement = OtpVerificationDAO.incrementWrongAttempts;
  const otpHash = OTPUtil.hash('123456');
  let attempts = 0;
  OtpVerificationDAO.find = async () => ({
    _id: 'otp-id',
    otpHash,
    otpExpiresAt: new Date(Date.now() + 60_000),
    expiresAt: new Date(Date.now() + 120_000),
    wrongAttempts: attempts,
  });
  OtpVerificationDAO.incrementWrongAttempts = async () => ({ wrongAttempts: ++attempts });

  try {
    for (let expectedRemaining = 4; expectedRemaining >= 0; expectedRemaining -= 1) {
      const res = response();
      await withoutNextError((next) => AuthController.verifyOtp(
        { body: { email: 'minh@example.com', otp: '000000' } }, res, next,
      ));
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, `Incorrect OTP. You have ${expectedRemaining} attempts remaining.`);
    }

    const sixthResponse = response();
    await withoutNextError((next) => AuthController.verifyOtp(
      { body: { email: 'minh@example.com', otp: '000000' } }, sixthResponse, next,
    ));
    assert.equal(sixthResponse.statusCode, 429);
    assert.equal(
      sixthResponse.body.message,
      'You entered an incorrect OTP more than 5 times. Select "Resend Code" to receive a new one.',
    );
  } finally {
    OtpVerificationDAO.find = originalFind;
    OtpVerificationDAO.incrementWrongAttempts = originalIncrement;
  }
});

test('resend is allowed for an existing expired or attempt-locked verification request', async () => {
  const originalFind = OtpVerificationDAO.find;
  const originalIssueOtp = AuthController.issueOtp;
  const payload = { fullName: 'Duy Minh', email: 'minh@example.com' };
  const issued = [];
  OtpVerificationDAO.find = async () => ({
    payload,
    wrongAttempts: 6,
    otpExpiresAt: new Date(Date.now() - 1000),
    resendAvailableAt: new Date(Date.now() - 1000),
  });
  AuthController.issueOtp = async (email, savedPayload) => { issued.push({ email, savedPayload }); };

  try {
    const res = response();
    await withoutNextError((next) => AuthController.resendOtp(
      { body: { email: 'minh@example.com' } }, res, next,
    ));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'A new verification code has been sent to your email.');
    assert.deepEqual(issued, [{ email: 'minh@example.com', savedPayload: payload }]);
  } finally {
    OtpVerificationDAO.find = originalFind;
    AuthController.issueOtp = originalIssueOtp;
  }
});

test('issuing an OTP retains pending registration data beyond the OTP validity window', async () => {
  const originalSave = OtpVerificationDAO.save;
  const originalSendOtp = EmailUtil.sendOtp;
  let saved;
  let delivered;
  OtpVerificationDAO.save = async (record) => { saved = record; };
  EmailUtil.sendOtp = async (email, otp) => { delivered = { email, otp }; };

  try {
    const before = Date.now();
    await AuthController.issueOtp('minh@example.com', { email: 'minh@example.com' });
    const after = Date.now();

    assert.match(delivered.otp, /^\d{6}$/);
    assert.equal(delivered.email, 'minh@example.com');
    assert.equal(saved.otpHash, OTPUtil.hash(delivered.otp));
    assert.ok(saved.otpExpiresAt.getTime() >= before + OTPUtil.OTP_EXPIRE_MS);
    assert.ok(saved.otpExpiresAt.getTime() <= after + OTPUtil.OTP_EXPIRE_MS);
    assert.ok(saved.expiresAt.getTime() >= before + OTPUtil.PENDING_EXPIRE_MS);
    assert.ok(saved.expiresAt.getTime() <= after + OTPUtil.PENDING_EXPIRE_MS);
    assert.ok(saved.expiresAt > saved.otpExpiresAt);
  } finally {
    OtpVerificationDAO.save = originalSave;
    EmailUtil.sendOtp = originalSendOtp;
  }
});
