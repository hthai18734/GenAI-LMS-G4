const PaginationUtil = require('../../domain/common/PaginationPolicy');
const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

class AdminTeacherService {
  constructor({ userRepository, notificationRepository } = {}) {
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
  }
  async list(query) {
    const [teachers, total] = await Promise.all([this.userRepository.findTeachers(query), this.userRepository.countAccounts(query)]);
    return { teachers, pagination: PaginationUtil.formatPaginatedResponse(teachers, total, query.page, query.limit).pagination };
  }
  async resolve(teacherId, action) {
    if (!isValidIdentifier(teacherId)) throw new ServiceError(400, 'Invalid teacher ID.');
    const operations = { detail: 'findTeacherById', suspend: 'suspendTeaching', unsuspend: 'unsuspendTeaching' };
    const teacher = await this.userRepository[operations[action]](teacherId);
    if (!teacher) throw new ServiceError(404, 'Teacher not found.');
    if (action !== 'detail') {
      const suspended = action === 'suspend';
      await this.notificationRepository.create({
        recipientId: teacher._id,
        title: suspended ? 'Teaching privileges suspended' : 'Teaching privileges restored',
        message: suspended ? 'Your teaching privileges have been temporarily suspended by an administrator. Contact an administrator for further details.' : 'Your teaching privileges have been restored by an administrator. You can now access your teacher portal and courses.',
        type: 'system',
      }).catch(() => {});
    }
    const messages = { detail: 'Success', suspend: 'Teaching privileges suspended.', unsuspend: 'Teaching privileges restored successfully.' };
    return { teacher, message: messages[action] };
  }
}
module.exports = AdminTeacherService;
