const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

class LessonVideoService {
  constructor({ lessonRepository, courseRepository, enrollmentRepository, videoStorageGateway, videoUploadRepository } = {}) {
    this.videoUploadRepository = videoUploadRepository;
    this.lessonRepository = lessonRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.videoStorage = videoStorageGateway;
  }

  async authorizeUpload(courseId, user) {
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');
    if (String(course.teacherId) !== String(user._id)) throw new ServiceError(403, 'You do not own this course.');
    if (!['DRAFT', 'APPROVED', 'REJECTED'].includes(course.status)) throw new ServiceError(409, 'Course content cannot be edited in the current course status.');
  }
  async registerUpload(courseId, user, file) {
    if (!file) throw new ServiceError(400, 'A video file is required.');
    try {
      await this.authorizeUpload(courseId, user);
      if (!this.videoStorage.validVideo(file.filename, file.mimetype)) throw new ServiceError(400, 'Video content does not match its format.');
      return await this.videoUploadRepository.create({ filename: file.filename, courseId, ownerId: user._id, mimeType: file.mimetype, sizeBytes: file.size, originalName: file.originalname, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    } catch (error) { this.videoStorage.removeBestEffort(this.videoStorage.resolveWithin(file.filename)); throw error; }
  }
  async prepareReference(courseId, user, videoRef, existing = null) {
    if (!videoRef) return null;
    if (!videoRef.startsWith('/uploads/lesson-videos/')) {
      try { if (!['http:', 'https:'].includes(new URL(videoRef).protocol)) throw new Error(); }
      catch { throw new ServiceError(400, 'Video URL must use HTTP(S).'); }
      return { source: 'external' };
    }
    const filename = videoRef.slice('/uploads/lesson-videos/'.length);
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) throw new ServiceError(400, 'Invalid video reference.');
    if (existing?.videoRef === videoRef) return existing.videoMetadata || null;
    const upload = await this.videoUploadRepository.find(filename);
    if (!upload || new Date(upload.expiresAt) <= new Date()) throw new ServiceError(404, 'Upload expired or missing. Upload the video again.');
    if (String(upload.courseId) !== String(courseId) || String(upload.ownerId) !== String(user._id)) throw new ServiceError(403, 'This upload does not belong to this course and teacher.');
    return { source: 'local', mimeType: upload.mimeType, sizeBytes: upload.sizeBytes, originalName: upload.originalName };
  }
  async discard(filename, user) {
    const upload = await this.videoUploadRepository.find(filename);
    if (!upload) return;
    if (String(upload.ownerId) !== String(user._id)) throw new ServiceError(403, 'This upload belongs to another teacher.');
    const ref = `/uploads/lesson-videos/${filename}`;
    if (!await this.lessonRepository.findByVideoRef(ref) && this.videoStorage.removeBestEffort(this.videoStorage.resolveWithin(filename)) === false) return false;
    await this.videoUploadRepository.remove(filename);
  }
  async cleanupAbandoned() {
    for (const upload of await this.videoUploadRepository.expired()) await this.discard(upload.filename, { _id: upload.ownerId });
    // Files left by a failed registry insert remain discoverable without a DB retry record.
    for (const filename of this.videoStorage.expiredVideoFilenames()) {
      if (!await this.videoUploadRepository.find(filename) && !await this.lessonRepository.findByVideoRef(`/uploads/lesson-videos/${filename}`)) {
        this.videoStorage.removeBestEffort(this.videoStorage.resolveWithin(filename));
      }
    }
  }
  async withMetadata(courseId, user, data, existing, persist) {
    const metadata = data.videoRef === undefined ? undefined : await this.prepareReference(courseId, user, data.videoRef, existing);
    try {
      const saved = await persist({ ...data, ...(metadata !== undefined ? { videoMetadata: metadata } : {}) });
      if (!saved) throw new ServiceError(409, 'Lesson changed while saving. Reload before retrying.');
      return saved;
    }
    catch (error) {
      if (data.videoRef?.startsWith('/uploads/lesson-videos/') && data.videoRef !== existing?.videoRef) {
        // Only a verified owner reaches this point; the periodic sweep retries failed cleanup.
        await this.discard(data.videoRef.split('/').pop(), user).catch(() => {});
      }
      throw error;
    }
  }

  async authorize(filename, user) {
    if (typeof filename !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new ServiceError(404, 'Lesson video not found.');
    }
    const lesson = await this.lessonRepository.findByVideoRef(`/uploads/lesson-videos/${filename}`);
    if (!lesson) throw new ServiceError(404, 'Lesson video not found.');
    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');

    const isAdmin = user.role === 'admin';
    const isOwner = user.role === 'teacher' && String(course.teacherId) === String(user._id);
    const enrollment = user.role === 'student' && lesson.isPublished === true
      && course.status === COURSE_STATUS.PUBLIC
      ? await this.enrollmentRepository.findAccessibleEnrollment(user._id, course._id)
      : null;
    if (!isAdmin && !isOwner && !enrollment) throw new ServiceError(403, 'You do not have access to this lesson video.');

    const filePath = this.videoStorage.resolveWithin(filename);
    if (!filePath) {
      throw new ServiceError(404, 'Lesson video not found.');
    }
    return filePath;
  }
}

module.exports = LessonVideoService;
