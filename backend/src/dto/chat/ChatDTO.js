const ServiceError = require('../../service/common/ServiceError');
const LearningDTO = require('./ChatLearningDTO');

class ChatDTO {
  static id(value) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw new ServiceError(400, 'ID không hợp lệ.');
    return value;
  }

  static create(body = {}) {
    const { courseId, lessonId } = body;
    if (!courseId && !lessonId) return {};
    return { courseId: this.id(courseId), lessonId: this.id(lessonId) };
  }

  static message(body = {}) {
    let { text = '', mode = 'ask', style = 'friendly', requestId } = body;
    const learning = LearningDTO.modes.includes(mode) ? LearningDTO.parse(mode, body.details) : null;
    if (learning) text = learning.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new ServiceError(400, 'Câu hỏi cần từ 1 đến 4.000 ký tự.');
    if (!['ask', 'summary', 'keypoints', ...LearningDTO.modes].includes(mode) || !['friendly', 'concise', 'academic'].includes(style)) throw new ServiceError(400, 'Chế độ hoặc văn phong không hợp lệ.');
    if (typeof requestId !== 'string' || !/^[\w-]{8,80}$/.test(requestId)) throw new ServiceError(400, 'Mã yêu cầu không hợp lệ.');
    return { text: text.trim(), mode, style, requestId, ...(learning ? { details: learning.details } : {}) };
  }

  static list(query = {}) {
    return { context: this.create(query), before: query.before ? this.id(query.before) : null };
  }
}
module.exports = ChatDTO;
