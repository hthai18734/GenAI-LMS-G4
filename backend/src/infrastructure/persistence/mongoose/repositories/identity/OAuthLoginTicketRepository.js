const crypto = require('crypto');
const OAuthLoginTicket = require('../../../../../model/identity/OAuthLoginTicket');

class OAuthLoginTicketRepository {
  async create(userId) {
    const code = crypto.randomBytes(32).toString('base64url');
    const codeHash = this.hash(code);
    await OAuthLoginTicket.create({
      codeHash,
      userId,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });
    return code;
  }

  async consume(code) {
    const codeHash = this.hash(code);
    const ticket = await OAuthLoginTicket.findOneAndDelete({
      codeHash,
      expiresAt: { $gt: new Date() },
    }).exec();

    return ticket;
  }

  hash(code) {
    return crypto.createHash('sha256').update(String(code)).digest('hex');
  }
}

module.exports = new OAuthLoginTicketRepository();
