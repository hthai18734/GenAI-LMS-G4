const ServiceError = require('../common/ServiceError');

class TeacherApplicationService {
  constructor({ teacherApplicationRepository, userRepository, notificationRepository, emailGateway } = {}) {
    this.teacherApplicationRepository = teacherApplicationRepository;
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.emailGateway = emailGateway;
  }
  async list(status) { return { applications: await this.teacherApplicationRepository.findAll({ status }) }; }
  async getPending(applicationId) {
    const application = await this.teacherApplicationRepository.findById(applicationId);
    if (!application) throw new ServiceError(404, 'Teacher application not found.');
    if (application.status !== 'pending') throw new ServiceError(400, `Application is already ${application.status}. Only pending applications can be processed.`);
    return application;
  }
  async approve({ applicationId, adminId }) {
    const application = await this.getPending(applicationId);
    const userId = application.userId?._id || application.userId;
    const updated = await this.teacherApplicationRepository.updateStatus(applicationId, 'approved', adminId);
    await this.userRepository.updateRole(userId, 'teacher');
    await this.notificationRepository.create({ recipientId: userId, title: 'Teacher Application Approved', message: 'Congratulations! Your application to teach on AI-LMS has been approved.', type: 'teacher approval' });
    if (application.userId?.email) await this.emailGateway.sendApplicationNotification(application.userId.email, 'approved', null);
    return { application: updated };
  }
  async reject({ applicationId, reason, adminId }) {
    const application = await this.getPending(applicationId);
    const userId = application.userId?._id || application.userId;
    const updated = await this.teacherApplicationRepository.updateStatus(applicationId, 'rejected', adminId, reason);
    await this.notificationRepository.create({ recipientId: userId, title: 'Teacher Application Not Approved', message: reason, type: 'teacher rejection' });
    if (application.userId?.email) await this.emailGateway.sendApplicationNotification(application.userId.email, 'rejected', reason);
    return { application: updated };
  }
}
module.exports = TeacherApplicationService;
