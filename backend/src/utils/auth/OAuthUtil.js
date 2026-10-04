const { OAuth2Client } = require('google-auth-library');
const JWTUtil = require('./JWTUtil');

class OAuthUtil {
  static getClient() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error('Google OAuth configuration is incomplete.');
    }
    return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  }

  static createAuthorizationUrl(origin = null) {
    const state = JWTUtil.createOAuthStateToken({ origin });
    const url = this.getClient().generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });
    return { state, url };
  }

  static async exchangeCode(code) {
    const client = this.getClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    if (!tokens.id_token) throw new Error('Google did not return an ID token.');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return { tokens, profile: ticket.getPayload() };
  }
}

module.exports = OAuthUtil;
