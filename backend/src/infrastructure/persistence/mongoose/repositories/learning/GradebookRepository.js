const mongoose = require('mongoose');
const Enrollment = require('../../../../../model/learning/Enrollment');
class GradebookRepository {
  async read(courseId, { page = 1, limit = 20 } = {}) {
    const [roster] = await Enrollment.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(String(courseId)), status: { $in: ['active', 'completed'] } } },
      { $group: { _id: '$userId' } }, { $sort: { _id: 1 } },
      { $facet: { total: [{ $count: 'count' }], students: [{ $skip: (page - 1) * limit }, { $limit: limit },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $project: { _id: 0, id: { $toString: '$_id' }, fullName: { $arrayElemAt: ['$user.fullName', 0] }, email: { $arrayElemAt: ['$user.email', 0] } } }] } },
    ]);
    return { students: roster?.students || [], total: roster?.total[0]?.count || 0 };
  }
}
module.exports = new GradebookRepository();
