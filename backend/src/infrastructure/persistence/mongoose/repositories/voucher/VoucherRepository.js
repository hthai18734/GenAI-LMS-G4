const Voucher = require('../../../../../model/voucher/Voucher');

class VoucherRepository {
  listFilter({ keyword = '', status = null } = {}) {
    const filter = { is_deleted: false };
    if (keyword) {
      const escaped = String(keyword).replace(/[^a-zA-Z0-9\u00c0-\u1ef9 ]/g, (character) => `\\${character}`);
      filter.code = { $regex: escaped, $options: 'i' };
    }
    if (status) filter.status = status;
    return filter;
  }

  expireBefore(now) {
    return Voucher.updateMany(
      { end_date: { $ne: null, $lt: now }, status: { $ne: 'expired' }, is_deleted: false },
      { $set: { status: 'expired' } },
    ).exec();
  }

  countList(criteria) { return Voucher.countDocuments(this.listFilter(criteria)).exec(); }
  findPageByCriteria(criteria, page, limit = 10) {
    return Voucher.find(this.listFilter(criteria)).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).lean().exec();
  }
  findAllActiveRecords() { return Voucher.find({ is_deleted: false }).lean().exec(); }
  findById(id, { includeRevision = false } = {}) {
    let query = Voucher.findOne({ _id: id, is_deleted: false });
    if (includeRevision) query = query.select('+usageRevision');
    return query.lean().exec();
  }
  existsCode(code, excludeId = null) {
    return Voucher.exists({ code, is_deleted: false, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
  }
  create(data) { return Voucher.create(data); }
  update(id, data) { return Voucher.updateOne({ _id: id, is_deleted: false }, { $set: data }).exec(); }
  softDeleteAtRevision(id, revision) {
    const versionFilter = revision == null
      ? { $or: [{ usageRevision: { $exists: false } }, { usageRevision: null }] }
      : { usageRevision: revision };
    return Voucher.updateOne(
      { _id: id, is_deleted: false, ...versionFilter },
      { $set: { is_deleted: true }, $inc: { usageRevision: 1 } },
    ).exec();
  }
  toggle(id, status) {
    return Voucher.updateOne(
      { _id: id, is_deleted: false, status: { $ne: 'expired' } },
      { $set: { status } },
    ).exec();
  }
  findCurrentlyActive(now) {
    return Voucher.find({
      is_deleted: false,
      status: 'active',
      $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] },
      ],
    }).sort({ end_date: 1 }).lean().exec();
  }
  findByCode(code, session = null) {
    return Voucher.findOne({ code, is_deleted: false }).session(session).lean().exec();
  }
  lockByCode(code, session) {
    return Voucher.findOneAndUpdate(
      { code, is_deleted: false },
      { $inc: { usageRevision: 1 } },
      { new: true, session },
    ).exec();
  }
}

module.exports = new VoucherRepository();
