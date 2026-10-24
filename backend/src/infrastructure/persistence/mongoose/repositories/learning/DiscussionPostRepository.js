const mongoose = require('mongoose');
const DiscussionPost = require('../../../../../model/learning/DiscussionPost');

class DiscussionPostRepository {
  async create(data) {
    return DiscussionPost.create(data);
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return DiscussionPost.findById(id).populate('authorId', 'fullName email avatar role').exec();
  }

  async findThreadsByCourse(courseId, { page = 1, limit = 10 } = {}) {
    if (!mongoose.isValidObjectId(courseId)) return { items: [], total: 0 };
    const filter = { courseId, parentId: null };
    const skip = (Math.max(1, page) - 1) * limit;

    const [threads, total] = await Promise.all([
      DiscussionPost.find(filter)
        .populate('authorId', 'fullName email avatar role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      DiscussionPost.countDocuments(filter),
    ]);

    // Attach reply count
    const threadIds = threads.map((t) => t._id);
    const replyCounts = await DiscussionPost.aggregate([
      { $match: { parentId: { $in: threadIds }, status: { $ne: 'deleted' } } },
      { $group: { _id: '$parentId', count: { $sum: 1 } } },
    ]);
    const replyCountMap = {};
    replyCounts.forEach((r) => { replyCountMap[String(r._id)] = r.count; });

    const items = threads.map((t) => {
      const obj = t.toObject();
      obj.replyCount = replyCountMap[String(t._id)] || 0;
      return obj;
    });

    return { items, total };
  }

  async findReplies(parentId) {
    if (!mongoose.isValidObjectId(parentId)) return [];
    return DiscussionPost.find({ parentId })
      .populate('authorId', 'fullName email avatar role')
      .sort({ createdAt: 1 })
      .exec();
  }

  async updateBody(id, body) {
    if (!mongoose.isValidObjectId(id)) return null;
    return DiscussionPost.findByIdAndUpdate(
      id,
      { body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('authorId', 'fullName email avatar role').exec();
  }

  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return DiscussionPost.findByIdAndUpdate(
      id,
      { status: 'deleted', body: 'This message has been deleted', deletedAt: new Date() },
      { new: true }
    ).populate('authorId', 'fullName email avatar role').exec();
  }
}

module.exports = new DiscussionPostRepository();
