const Review = require('../../../../../model/engagement/Review');
const mongoose = require('mongoose');
const Course = require('../../../../../model/learning/Course');
function persistenceError(code) { const error = new Error(code); error.code = code; return error; }
const ratingJobs = new Map();

async function serializeRating(courseId, work) {
  const key = String(courseId);
  const previous = ratingJobs.get(key) || Promise.resolve();
  const job = previous.catch(() => {}).then(work);
  ratingJobs.set(key, job);
  try { return await job; }
  finally { if (ratingJobs.get(key) === job) ratingJobs.delete(key); }
}

class ReviewRepository {
  filter(criteria = {}) {
    const filter = {};
    const search = String(criteria.search || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (search) filter.content = { $regex: search, $options: 'i' };
    if (criteria.status) filter.status = criteria.status;
    if (criteria.courseId) filter.courseId = criteria.courseId;
    if (criteria.courseIds) filter.courseId = { $in: criteria.courseIds };
    if (criteria.userId) filter.userId = criteria.userId;
    return filter;
  }
  async create(data, session) {
    if (await Review.exists({ userId: data.userId, courseId: data.courseId }).session(session || null)) throw persistenceError('REVIEW_DUPLICATE');
    const [review] = await Review.create([data], { session });
    return review;
  }
  async remove(id, filter, session) { return Review.findOneAndDelete({ _id: id, ...filter }, { session }).exec(); }

  // Replica sets commit review/rating writes together; standalone uses a local
  // queue and durable repair marker. Deploy multiple API instances on a replica set.
  async mutateWithRating(courseId, mutation, { publicOnly = false } = {}) {
    try {
      const hello = await mongoose.connection.db.admin().command({ hello: 1 });
      if (!hello.setName && hello.msg !== 'isdbgrid') {
        // Local standalone MongoDB has no transactions. Serialize this app's writes
        // and leave a durable repair marker if the process exits between writes.
        return await serializeRating(courseId, async () => {
          const course = await Course.findOneAndUpdate({ _id: courseId, ...(publicOnly ? { status: Course.COURSE_STATUS.PUBLIC, deletedAt: null } : {}) },
            { $inc: { reviewRevision: 1 }, $set: { ratingDirty: true } }, { new: true });
          if (!course) throw persistenceError('COURSE_NOT_FOUND');
          const review = await mutation();
          if (!review) throw persistenceError('REVIEW_NOT_FOUND');
          const averageRating = await this.recalculate(course._id);
          return { review, courseId: course._id, averageRating };
        });
      }
      return await mongoose.connection.transaction(async (session) => {
        const course = await Course.findOneAndUpdate({ _id: courseId, ...(publicOnly ? { status: Course.COURSE_STATUS.PUBLIC, deletedAt: null } : {}) },
          { $inc: { reviewRevision: 1 } }, { new: true, session });
        if (!course) throw persistenceError('COURSE_NOT_FOUND');
        const review = await mutation(session);
        if (!review) throw persistenceError('REVIEW_NOT_FOUND');
        const [stats] = await Review.aggregate([{ $match: { courseId: course._id, status: 'visible' } }, { $group: { _id: null, average: { $avg: '$rating' } } }]).session(session);
        const averageRating = stats?.average || 0;
        await Course.updateOne({ _id: course._id }, { $set: { averageRating, ratingDirty: false } }, { session });
        return { review, courseId: course._id, averageRating };
      });
    } catch (error) {
      if (error.code === 11000) throw persistenceError('REVIEW_DUPLICATE');
      throw error;
    }
  }
  async recalculate(courseId) {
    const [stats] = await Review.aggregate([{ $match: { courseId } }, { $match: { status: 'visible' } }, { $group: { _id: null, average: { $avg: '$rating' } } }]);
    const averageRating = stats?.average || 0;
    await Course.updateOne({ _id: courseId }, { $set: { averageRating, ratingDirty: false } });
    return averageRating;
  }
  async repairPendingRatings() {
    const pending = await Course.find({ ratingDirty: true }).select('_id').limit(100).lean();
    for (const course of pending) await this.mutateWithRating(course._id, async () => true);
  }
  async findById(id) { return Review.findById(id).exec(); }
  async findDetail(id) {
    return Review.findById(id).populate('userId', 'fullName').populate('courseId', 'title teacherId averageRating').populate('reply.userId', 'fullName').exec();
  }
  async findAll(criteria, { skip, limit }) {
    return Review.find(this.filter(criteria)).populate('userId', 'fullName').populate('courseId', 'title teacherId').populate('reply.userId', 'fullName')
      .sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec();
  }
  async count(criteria) { return Review.countDocuments(this.filter(criteria)).exec(); }
  async update(id, filter, updates, session) {
    return Review.findOneAndUpdate({ _id: id, ...filter }, { $set: updates }, { new: true, runValidators: true, session }).exec();
  }
  async findVisibleRatings(courseId) { return Review.find({ courseId, status: 'visible' }).select('rating').lean().exec(); }
}
module.exports = new ReviewRepository();
