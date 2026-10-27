const ServiceError = require('../common/ServiceError');

class StudentTeacherApplicationService {
  constructor({ teacherApplicationRepository } = {}) {
    this.teacherApplicationRepository = teacherApplicationRepository;
  }

  async getTeacherApplication(userId) {
    return { application: await this.teacherApplicationRepository.findLatestByUser(userId) };
  }

  async applyTeacher(user, body) {
    const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
    if (bio.length < 10) throw new ServiceError(400, 'Please describe yourself and your professional experience (at least 10 characters).');
    if (user.role === 'teacher') throw new ServiceError(400, 'Your account already has the teacher role.');
    if (await this.teacherApplicationRepository.findPendingByUser(user._id)) {
      throw new ServiceError(400, 'You already have an application awaiting administrator review.');
    }
    const certificates = Array.isArray(body.certificates)
      ? body.certificates
      : typeof body.certificates === 'string'
        ? body.certificates.split(',').map((certificate) => certificate.trim()).filter(Boolean)
        : [];
    const application = await this.teacherApplicationRepository.create({
      userId: user._id,
      bio,
      cvUrl: body.cvUrl ? body.cvUrl.trim() : null,
      certificates,
      status: 'pending',
    });
    return { application };
  }
}

module.exports = StudentTeacherApplicationService;
