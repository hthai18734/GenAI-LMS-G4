const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthFilter } = require('../../src/filter/AuthFilter');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('authentication ignores access tokens supplied through the query string', async () => {
  let verified = false;
  const filter = createAuthFilter({
    userRepository: { findById: async () => null },
    refreshSessionRepository: { findActive: async () => null },
    jwtUtil: { verifyAccessToken() { verified = true; } },
  });
  const res = response();

  await filter({ headers: {}, query: { token: 'must-not-be-read' } }, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Please log in to continue.');
  assert.equal(verified, false);
});

test('authentication accepts an access token through the Bearer header', async () => {
  const user = { _id: 'user-1', role: 'student', status: 'active', tokenVersion: 0, emailVerifiedAt: new Date() };
  const filter = createAuthFilter({
    userRepository: { findById: async id => id === user._id ? user : null },
    refreshSessionRepository: { findActive: async () => true },
    jwtUtil: { verifyAccessToken: token => token === 'access-token' ? { sub: user._id, version: 0 } : null },
  });
  const req = { headers: { authorization: 'Bearer access-token' }, query: {} };
  const res = response();
  let nextCalled = false;

  await filter(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user, user);
  assert.equal(res.body, null);
});
