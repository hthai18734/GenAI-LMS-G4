const OAuthAccount = require('../../../../../model/identity/OAuthAccount');

class OAuthAccountRepository {
  async linkGoogleAccount(userId, profile) {
    return OAuthAccount.findOneAndUpdate(
      { provider: 'google', providerAccountId: profile.sub, userId },
      { userId, provider: 'google', providerAccountId: profile.sub, email: profile.email || null },
      { upsert: true, new: true, runValidators: true },
    ).exec();
  }
}

module.exports = new OAuthAccountRepository();
