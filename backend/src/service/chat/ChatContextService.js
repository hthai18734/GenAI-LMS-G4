const CourseDAO = require('../../dao/learning/CourseDAO');
const Lesson = require('../../model/learning/Lesson');
const Enrollment = require('../../model/learning/Enrollment');
const ServiceError = require('../common/ServiceError');
const ChatDTO = require('../../dto/chat/ChatDTO');

class ChatContextService {
  constructor(source = {
    course: id => CourseDAO.findById(id),
    lesson: id => Lesson.findById(id).lean().exec(),
    enrolled: (userId, courseId) => Enrollment.exists({ userId, courseId, status: { $in: ['active', 'completed'] } }),
  }) { this.source = source; }

  async resolve(user, { courseId, lessonId } = {}) {
    if (!['student', 'teacher', 'admin'].includes(user.role)) throw new ServiceError(403, 'Bạn không có quyền sử dụng chat.');
    if (!courseId && !lessonId) return null;
    ChatDTO.create({ courseId: String(courseId), lessonId: String(lessonId) });
    const course = await this.source.course(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Khóa học không còn khả dụng.');
    if (user.role === 'student' && !await this.source.enrolled(user._id, courseId)) throw new ServiceError(403, 'Bạn cần đăng ký khóa học để hỏi về bài học này.');
    if (user.role === 'teacher' && String(course.teacherId) !== String(user._id)) throw new ServiceError(403, 'Bạn chỉ được đọc bài học thuộc khóa học của mình.');
    const lesson = await this.source.lesson(lessonId);
    if (!lesson || String(lesson.courseId) !== String(courseId)) throw new ServiceError(404, 'Không tìm thấy bài học trong khóa học.');
    return { title: lesson.title, content: lesson.content || '', courseTitle: course.title || '' };
  }
}
module.exports = ChatContextService;
