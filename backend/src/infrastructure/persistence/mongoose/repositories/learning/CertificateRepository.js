const mongoose = require('mongoose');
require('../../../../../model/learning/Course');
require('../../../../../model/learning/Enrollment');
const Certificate = require('../../../../../model/learning/Certificate');

class CertificateRepository {
  async findByUserId(userId) {
    if (!mongoose.isValidObjectId(userId)) return [];
    const certs = await Certificate.find({ userId })
      .populate('courseId')
      .populate('enrollmentId')
      .sort({ issuedAt: -1 })
      .exec();
    return certs.filter((c) => c.courseId && !c.courseId.deletedAt);
  }

  async findOneByCourse(userId, courseId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return null;
    const cert = await Certificate.findOne({ userId, courseId }).populate('courseId').populate('enrollmentId').exec();
    if (!cert || !cert.courseId || cert.courseId.deletedAt) return null;
    return cert;
  }

  async issueCertificate(userId, courseId, enrollmentId) {
    const certificateNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      return await Certificate.findOneAndUpdate({ userId, courseId }, {
        $setOnInsert: { enrollmentId, certificateNumber, issuedAt: new Date() },
      }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).exec();
    } catch (error) {
      if (error.code === 11000) {
        const existing = await this.findOneByCourse(userId, courseId);
        if (existing) return existing;
      }
      throw error;
    }
  }
}

module.exports = new CertificateRepository();
