const mongoose = require('mongoose');
const AssignmentSubmission = require('../../../../../model/learning/AssignmentSubmission');

class AssignmentSubmissionRepository {
  async submit(assignmentId, courseId, studentId, answer) {
    return AssignmentSubmission.findOneAndUpdate(
      { assignmentId, studentId },
      { $set: { courseId, answer, status: 'submitted', feedback: '', submittedAt: new Date(), gradedAt: null, gradedBy: null } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    ).exec();
  }

  async findPassedAssignmentIds(studentId, courseId) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId)) return [];
    const rows = await AssignmentSubmission.find({ studentId, courseId, status: 'passed' }).select('assignmentId').lean().exec();
    return rows.map((row) => String(row.assignmentId));
  }

  async findById(id) { return mongoose.isValidObjectId(id) ? AssignmentSubmission.findById(id).exec() : null; }
  async findByStudentAndCourse(studentId, courseId) {
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(courseId)) return [];
    return AssignmentSubmission.find({ studentId, courseId }).lean().exec();
  }
  async findByAssignmentAndStudent(assignmentId, studentId) {
    if (!mongoose.isValidObjectId(assignmentId) || !mongoose.isValidObjectId(studentId)) return null;
    return AssignmentSubmission.findOne({ assignmentId, studentId }).lean().exec();
  }
  async grade(id, teacherId, status, feedback = '') {
    return AssignmentSubmission.findByIdAndUpdate(id, { $set: { status, feedback, gradedAt: new Date(), gradedBy: teacherId } }, { new: true, runValidators: true }).exec();
  }
}
module.exports = new AssignmentSubmissionRepository();
