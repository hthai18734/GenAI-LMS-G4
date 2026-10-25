const path = require('path');
const ServiceError = require('../common/ServiceError');

class LessonVideoService {
  constructor({ lessonRepository, courseRepository, enrollmentRepository, videoDirectory } = {}) {
    this.lessonRepository = lessonRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.videoDirectory = videoDirectory;
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
      ? await this.enrollmentRepository.findAccessibleEnrollment(user._id, course._id)
      : null;
    if (!isAdmin && !isOwner && !enrollment) throw new ServiceError(403, 'You do not have access to this lesson video.');

    const filePath = path.resolve(this.videoDirectory, filename);
    if (path.dirname(filePath) !== path.resolve(this.videoDirectory)) {
      throw new ServiceError(404, 'Lesson video not found.');
    }
    return filePath;
  }
}

module.exports = LessonVideoService;
