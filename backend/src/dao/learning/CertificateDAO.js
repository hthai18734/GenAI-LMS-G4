const mongoose = require('mongoose');
const Certificate = require('../../model/learning/Certificate');

class CertificateDAO {
  async findByUserId(userId) {
    if (!mongoose.isValidObjectId(userId)) return [];
    return Certificate.find({ userId })
      .populate('courseId')
      .populate('enrollmentId')
      .sort({ issuedAt: -1 })
      .exec();
  }

  async findOneByCourse(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    return Certificate.findOne({ userId, courseId }).populate('courseId').populate('enrollmentId').exec();
  }

  async issueCertificate(userId, courseId, enrollmentId) {
    const existing = await this.findOneByCourse(userId, courseId);
    if (existing) return existing;
    const certificateNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    return Certificate.create({ userId, courseId, enrollmentId, certificateNumber, issuedAt: new Date() });
  }
}

module.exports = new CertificateDAO();
