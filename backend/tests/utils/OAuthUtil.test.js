const test = require('node:test');
const assert = require('node:assert/strict');
const OAuthUtil = require('../../src/utils/auth/OAuthUtil');

test('Google code exchange requires an ID token and verifies the configured audience', async (t) => {
  const originalClient = OAuthUtil.getClient;
  const originalId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'expected-client';
  t.after(() => { OAuthUtil.getClient = originalClient; if (originalId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = originalId; });
  let tokens = { id_token: 'provider-id-token', access_token: 'provider-access-token' };
  let verificationError = null;
  OAuthUtil.getClient = () => ({
    getToken: async (code) => { assert.equal(code, 'authorization-code'); return { tokens }; },
    setCredentials: (credentials) => assert.equal(credentials, tokens),
    verifyIdToken: async (options) => {
      assert.deepEqual(options, { idToken: 'provider-id-token', audience: 'expected-client' });
      if (verificationError) throw verificationError;
      return { getPayload: () => ({ sub: 'google-user', email: 'google@test.edu', email_verified: true }) };
    },
  });
  const result = await OAuthUtil.exchangeCode('authorization-code');
  assert.equal(result.profile.sub, 'google-user');
  verificationError = new Error('Invalid token signature or audience');
  await assert.rejects(OAuthUtil.exchangeCode('authorization-code'), /Invalid token signature/);
  tokens = { access_token: 'access-without-id-token' };
  await assert.rejects(OAuthUtil.exchangeCode('authorization-code'), /did not return an ID token/);
});
