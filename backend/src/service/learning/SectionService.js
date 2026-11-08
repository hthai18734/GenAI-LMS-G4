const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');
class SectionService {
  constructor({ sectionRepository, courseRepository } = {}) { Object.assign(this, { sectionRepository, courseRepository }); }
  async owned(courseId, user, editable = false) {
    if (!isValidIdentifier(courseId)) throw new ServiceError(400, 'Course ID is invalid.');
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');
    if (String(course.teacherId) !== String(user._id)) throw new ServiceError(403, 'You do not have permission to manage this course.');
    if (editable && !['DRAFT', 'REJECTED', 'APPROVED'].includes(course.status)) throw new ServiceError(409, 'Course content cannot be edited in the current course status.');
    return course;
  }
  async create(courseId, user, input) {
    await this.owned(courseId, user, true);
    return this.sectionRepository.create({ courseId, title: input.title, description: input.description || '', order: await this.sectionRepository.nextOrder(courseId) });
  }
  async list(courseId, user) { await this.owned(courseId, user); return this.sectionRepository.findByCourseId(courseId); }
  async resolve(courseId, sectionId) {
    if (sectionId && !isValidIdentifier(sectionId)) throw new ServiceError(400, 'Section ID is invalid.');
    const section = sectionId ? await this.sectionRepository.findById(sectionId) : await this.sectionRepository.ensureDefault(courseId);
    if (!section || section.deletedAt || String(section.courseId) !== String(courseId)) throw new ServiceError(404, 'Section not found in this course.');
    return section;
  }
}
module.exports = SectionService;
