const DTOValidationError = require('../common/DTOValidationError');
const LearningDTO = require('./ChatLearningDTO');

class ChatDTO {
  static payload(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new DTOValidationError('Request payload must be an object.');
    }
    return value;
  }

  static id(value) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw new DTOValidationError('Invalid ID.');
    return value;
  }

  static create(body = {}) {
    body = this.payload(body);
    const { courseId, lessonId } = body;
    if (!courseId && !lessonId) return {};
    return { courseId: this.id(courseId), lessonId: this.id(lessonId) };
  }

  static message(body = {}) {
    body = this.payload(body);
    let { text = '', mode = 'ask', style = 'friendly', requestId } = body;
    const learning = LearningDTO.modes.includes(mode) ? LearningDTO.parse(mode, body.details) : null;
    if (learning) text = learning.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new DTOValidationError('Your question must contain 1 to 4,000 characters.');
    if (!['ask', 'summary', 'keypoints', ...LearningDTO.modes].includes(mode) || !['friendly', 'concise', 'academic'].includes(style)) throw new DTOValidationError('Invalid mode or style.');
    if (typeof requestId !== 'string' || !/^[\w-]{8,80}$/.test(requestId)) throw new DTOValidationError('Invalid request ID.');
    return { text: text.trim(), mode, style, requestId, ...(learning ? { details: learning.details } : {}) };
  }

  static list(query = {}) {
    query = this.payload(query);
    return { context: this.create(query), before: query.before ? this.id(query.before) : null };
  }
}
module.exports = ChatDTO;
