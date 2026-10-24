const ServiceError = require('../common/ServiceError');
const ChatDTO = require('../../dto/chat/ChatDTO');

class ChatContextService {
  constructor(source) { this.source = source; }

  async resolve(user, { courseId, lessonId } = {}) {
    if (!['student', 'teacher', 'admin'].includes(user.role)) throw new ServiceError(403, 'You do not have permission to use chat.');
    if (!courseId && !lessonId) return null;
    if (user.role === 'teacher' && user.teachingStatus === 'suspended') throw new ServiceError(403, 'Your teaching privileges are suspended.');
    ChatDTO.create({ courseId: String(courseId), lessonId: String(lessonId) });
    const course = await this.source.course(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'This course is no longer available.');
    if (user.role === 'student' && !await this.source.enrolled(user._id, courseId)) throw new ServiceError(403, 'You must enroll in the course to ask about this lesson.');
    if (user.role === 'teacher' && String(course.teacherId) !== String(user._id)) throw new ServiceError(403, 'You can only access lessons in your own courses.');
    const lesson = await this.source.lesson(lessonId);
    if (!lesson || String(lesson.courseId) !== String(courseId)) throw new ServiceError(404, 'Lesson not found in this course.');
    return { title: lesson.title, content: lesson.content || '', courseTitle: course.title || '' };
  }
}
module.exports = ChatContextService;
