const Assignment = require('../../model/learning/Assignment');

class AssignmentDAO {
  async create(data) { return Assignment.create(data); }

  async findByCourseId(courseId) {
    return Assignment.find({ courseId }).sort({ createdAt: -1, _id: -1 }).exec();
  }
}

module.exports = new AssignmentDAO();
