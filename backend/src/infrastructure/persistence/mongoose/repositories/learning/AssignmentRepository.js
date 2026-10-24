const mongoose = require('mongoose');
const Assignment = require('../../../../../model/learning/Assignment');

class AssignmentRepository {
  async create(data) { return Assignment.create(data); }
  async findByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return Assignment.find({ courseId }).sort({ createdAt: -1, _id: -1 }).exec();
  }
  async findById(id) { return mongoose.isValidObjectId(id) ? Assignment.findById(id).exec() : null; }
}

module.exports = new AssignmentRepository();
