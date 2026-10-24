const mongoose = require('mongoose');
const Wishlist = require('../../../../../model/learning/Wishlist');

class WishlistRepository {
  async add(studentId, courseId) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId)) return null;
    return Wishlist.findOneAndUpdate(
      { studentId, courseId },
      { studentId, courseId, addedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  async remove(studentId, courseId) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId)) return null;
    return Wishlist.findOneAndDelete({ studentId, courseId }).exec();
  }

  async isWishlisted(studentId, courseId) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId)) return false;
    const exists = await Wishlist.exists({ studentId, courseId });
    return Boolean(exists);
  }

  async findByStudent(studentId, { page = 1, limit = 10 } = {}) {
    if (!mongoose.isValidObjectId(studentId)) return { items: [], total: 0 };
    const skip = (Math.max(1, page) - 1) * limit;
    const [items, total] = await Promise.all([
      Wishlist.find({ studentId })
        .populate({
          path: 'courseId',
          populate: { path: 'teacherId', select: 'fullName email avatar' },
        })
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Wishlist.countDocuments({ studentId }),
    ]);
    return { items, total };
  }

  async countByStudent(studentId) {
    if (!mongoose.isValidObjectId(studentId)) return 0;
    return Wishlist.countDocuments({ studentId });
  }
}

module.exports = new WishlistRepository();
