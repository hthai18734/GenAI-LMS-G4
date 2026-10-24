const VoucherRedemption = require('../../../../../model/voucher/VoucherRedemption');

class VoucherRedemptionRepository {
  countUsed(voucherID, session = null) {
    return VoucherRedemption.countDocuments({ voucherID, is_used: true }).session(session).exec();
  }
  async hasUsed(userId, voucherID, session = null) {
    return Boolean(await VoucherRedemption.exists({ userId, voucherID, is_used: true }).session(session));
  }
  countAllUsed() { return VoucherRedemption.countDocuments({ is_used: true }).exec(); }
  async history(voucherID, requestedPage, limit = 10) {
    const totalRecords = await this.countUsed(voucherID);
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
    const page = Math.min(requestedPage, totalPages);
    const redemptions = await VoucherRedemption.find({ voucherID, is_used: true })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'fullName email')
      .lean()
      .exec();
    return { redemptions, page, totalPages, totalRecords };
  }
  findByTransactionId(transactionId, session = null) {
    return VoucherRedemption.findOne({ transactionId }).session(session).exec();
  }
  async create(data, session) {
    const [redemption] = await VoucherRedemption.create([data], { session });
    return redemption;
  }
}

module.exports = new VoucherRedemptionRepository();
