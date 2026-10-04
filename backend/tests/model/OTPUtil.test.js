const test = require('node:test');
const assert = require('node:assert/strict');
const OTPUtil = require('../../src/utils/auth/OTPUtil');

test('OTP is six digits and verifies through a hash', () => {
  const otp = OTPUtil.generate();
  assert.match(otp, /^\d{6}$/);
  const hash = OTPUtil.hash(otp);
  assert.equal(OTPUtil.verify(otp, hash), true);
  assert.equal(OTPUtil.verify('000000', hash), otp === '000000');
});
