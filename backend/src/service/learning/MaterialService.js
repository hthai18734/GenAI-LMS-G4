const fs = require('fs');
const path = require('path');
const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

class MaterialService {
  constructor({ materialRepository, lessonRepository, courseRepository, enrollmentRepository } = {}) {
    this.materialRepository = materialRepository;
    this.lessonRepository = lessonRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  async assertTeacherOwnsLesson(lessonId, user) {
    this.assertValidId(lessonId, 'Lesson ID');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.deletedAt) throw new ServiceError(404, 'Lesson not found.');

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');

    if (user.role !== 'admin' && String(course.teacherId) !== String(user._id) && String(course.instructorId) !== String(user._id)) {
      throw new ServiceError(403, 'You do not have permission to manage materials for this lesson.');
    }
    return { lesson, course };
  }

  async uploadMaterial(lessonId, user, file, meta = {}) {
    if (!file) throw new ServiceError(422, 'Please select a valid material file to upload.');
    const { lesson, course } = await this.assertTeacherOwnsLesson(lessonId, user);

    const displayName = (meta.name || file.originalname || 'Material').trim();
    if (!displayName) throw new ServiceError(422, 'Material name cannot be empty.');

    const material = await this.materialRepository.create({
      lessonId: lesson._id,
      courseId: course._id,
      name: displayName,
      description: (meta.description || '').trim(),
      storageKey: file.filename,
      filePath: file.path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      createdBy: user._id,
    });

    return this.toSafeDTO(material);
  }

  async listMaterials(lessonId, user) {
    this.assertValidId(lessonId, 'Lesson ID');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.deletedAt) throw new ServiceError(404, 'Lesson not found.');

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');

    const isOwner = user && (user.role === 'admin' || String(course.teacherId) === String(user._id) || String(course.instructorId) === String(user._id));

    if (!isOwner) {
      if (!lesson.isPublished) throw new ServiceError(404, 'Lesson not accessible.');
      const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, course._id);
      if (!enrollment) throw new ServiceError(403, 'You must be enrolled to view materials.');
    }

    const items = await this.materialRepository.findActiveByLessonId(lessonId);
    return items.map((m) => this.toSafeDTO(m));
  }

  async updateMaterial(materialId, user, payload) {
    this.assertValidId(materialId, 'Material ID');
    const material = await this.materialRepository.findById(materialId);
    if (!material) throw new ServiceError(404, 'Material not found.');

    await this.assertTeacherOwnsLesson(material.lessonId, user);

    const updates = {};
    if (payload.name !== undefined) {
      const name = String(payload.name).trim();
      if (!name) throw new ServiceError(422, 'Material name cannot be empty.');
      updates.name = name;
    }
    if (payload.description !== undefined) {
      updates.description = String(payload.description).trim();
    }

    const updated = await this.materialRepository.update(materialId, updates);
    return this.toSafeDTO(updated);
  }

  async deleteMaterial(materialId, user) {
    this.assertValidId(materialId, 'Material ID');
    const material = await this.materialRepository.findById(materialId);
    if (!material) throw new ServiceError(404, 'Material not found.');

    await this.assertTeacherOwnsLesson(material.lessonId, user);
    await this.materialRepository.softDelete(materialId);

    // Optional physical cleanup
    try {
      if (material.filePath && fs.existsSync(material.filePath)) {
        fs.unlinkSync(material.filePath);
      }
    } catch { /* best effort */ }

    return true;
  }

  async getDownloadInfo(materialId, user) {
    this.assertValidId(materialId, 'Material ID');
    const material = await this.materialRepository.findById(materialId);
    if (!material || material.deletedAt) throw new ServiceError(404, 'Material not found or no longer available.');

    const course = await this.courseRepository.findById(material.courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');

    const isOwner = user && (user.role === 'admin' || String(course.teacherId) === String(user._id) || String(course.instructorId) === String(user._id));
    if (!isOwner) {
      const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, course._id);
      if (!enrollment) throw new ServiceError(403, 'You must be enrolled to download this material.');
    }

    if (!fs.existsSync(material.filePath)) {
      throw new ServiceError(410, 'Material file is missing on storage. Please contact the instructor.');
    }

    const ext = path.extname(material.filePath);
    const downloadFileName = material.name.toLowerCase().endsWith(ext.toLowerCase())
      ? material.name
      : `${material.name}${ext}`;

    return {
      filePath: material.filePath,
      fileName: downloadFileName,
      mimeType: material.mimeType,
    };
  }

  toSafeDTO(material) {
    return {
      id: String(material._id),
      lessonId: String(material.lessonId),
      courseId: String(material.courseId),
      name: material.name,
      description: material.description,
      mimeType: material.mimeType,
      sizeBytes: material.sizeBytes,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
    };
  }
}

module.exports = MaterialService;
