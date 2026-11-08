const mongoose = require('mongoose');
const AssignmentSubmission = require('../../../../../model/learning/AssignmentSubmission');

class AssignmentSubmissionRepository {
  async submit(assignmentId, courseId, studentId, answer, submittedAt = new Date(), attachment = null, revision) {
    return AssignmentSubmission.findOneAndUpdate(
      { assignmentId, studentId, ...(revision === undefined ? {} : revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision }) },
      { $set: { courseId, answer, attachment, status: 'submitted', feedback: '', score: null, maxScore: null, submittedAt, gradedAt: null, gradedBy: null, feedbackAt: null, feedbackBy: null }, $inc: { revision: 1 } },
      { upsert: revision === undefined, new: true, setDefaultsOnInsert: true, runValidators: true },
    ).exec();
  }
  async hasNumericGrades(assignmentId) { return Boolean(await AssignmentSubmission.exists({ assignmentId, score: { $ne: null } })); }
  async findPage(assignmentId, { page = 1, limit = 20, status, studentId } = {}) {
    const filter = { assignmentId, ...(status ? { status } : {}), ...(studentId ? { studentId } : {}) };
    const [submissions, total] = await Promise.all([
      AssignmentSubmission.find(filter).select('-answer').populate('studentId', 'fullName email').sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AssignmentSubmission.countDocuments(filter),
    ]);
    return { submissions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
  async assess(id, revision, changes) {
    return AssignmentSubmission.findOneAndUpdate({ _id: id, ...(revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision }) }, { $set: changes, $inc: { revision: 1 } }, { new: true, runValidators: true }).exec();
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
