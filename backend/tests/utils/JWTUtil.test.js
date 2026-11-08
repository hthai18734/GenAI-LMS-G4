const test = require('node:test');
const assert = require('node:assert/strict');
const JWTUtil = require('../../src/utils/auth/JWTUtil');

test('access and refresh tokens preserve session and token-version contracts', (t) => {
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = 'test-secret-with-enough-entropy';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = originalSecret;
  });

  const user = { _id: 'user-1', role: 'student', tokenVersion: 3 };
  const access = JWTUtil.verifyAccessToken(JWTUtil.createAccessToken(user, 'session-1'));
  assert.equal(access.sid, 'session-1');
  assert.equal(access.version, 3);

  const refreshToken = JWTUtil.createRefreshToken(user, 'session-1');
  const refresh = JWTUtil.verifyRefreshToken(refreshToken);
  assert.equal(refresh.sub, 'user-1');
  assert.equal(refresh.sid, 'session-1');
  assert.equal(refresh.version, 3);
  assert.equal(refresh.type, 'refresh');
  assert.ok(refresh.jti);

  assert.throws(() => JWTUtil.verifyRefreshToken(JWTUtil.createAccessToken(user)), /Invalid refresh token type/);
});
