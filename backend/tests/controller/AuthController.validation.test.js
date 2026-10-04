const test = require('node:test');
const assert = require('node:assert/strict');
const AuthController = require('../../src/controller/auth/AuthController');

test('registration validation accepts a valid Iteration 1 registration payload', () => {
  assert.equal(
    AuthController.validateRegistration(
      'Duy Minh',
      'minh@example.com',
      '0912345678',
      'Strong1!',
      'Strong1!',
    ),
    null,
  );
});

test('registration validation preserves full-name and password-confirmation rules', () => {
  assert.match(
    AuthController.validateRegistration(
      'Minh',
      'minh@example.com',
      '0912345678',
      'Strong1!',
      'Strong1!',
    ),
    /at least two words/,
  );
  assert.match(
    AuthController.validateRegistration(
      'Duy Minh',
      'minh@example.com',
      '0912345678',
      'Strong1!',
      'Strong2!',
    ),
    /do not match/,
  );
});

test('registration validation enforces the UC password length of 8–15 characters', () => {
  assert.equal(
    AuthController.validateRegistration(
      'Duy Minh',
      'minh@example.com',
      '0912345678',
      'Aa1!123',
      'Aa1!123',
    ),
    'Password must be 8–15 characters long.',
  );
  assert.equal(
    AuthController.validateRegistration(
      'Duy Minh',
      'minh@example.com',
      '0912345678',
      'Aa1!123456789012',
      'Aa1!123456789012',
    ),
    'Password must be 8–15 characters long.',
  );
  assert.equal(
    AuthController.validateRegistration(
      'Duy Minh',
      'minh@example.com',
      '0912345678',
      'Aa1!12345678901',
      'Aa1!12345678901',
    ),
    null,
  );
});
