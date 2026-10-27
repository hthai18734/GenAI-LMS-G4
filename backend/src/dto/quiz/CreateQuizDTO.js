const { text, objectId, unknownFields, isObjectPayload, strictNumber } = require('../common/DTOUtil');

class CreateQuizDTO {
  constructor(body = {}) {
    this.payloadIsObject = isObjectPayload(body);
    this.body = this.payloadIsObject ? body : {};
    body = this.body;
    this.title = text(body.title);
    this.lessonId = body.lessonId === undefined || body.lessonId === null || body.lessonId === '' ? null : body.lessonId;
    this.timeLimit = body.timeLimit;
    this.passingScore = body.passingScore;
    this.attemptLimit = body.attemptLimit;
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Request body must be an object.';
    const unknown = unknownFields(this.body, ['title', 'lessonId', 'timeLimit', 'passingScore', 'attemptLimit']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!this.title) errors.title = 'Quiz title is required.';
    else if (this.title.length > 200) errors.title = 'Quiz title must not exceed 200 characters.';
    if (this.lessonId !== null && (typeof this.lessonId !== 'string' || !objectId(this.lessonId))) {
      errors.lessonId = 'Lesson ID is invalid.';
    }
    if (!Number.isInteger(strictNumber(this.timeLimit)) || strictNumber(this.timeLimit) < 1) {
      errors.timeLimit = 'Time limit must be an integer greater than zero.';
    }
    if (strictNumber(this.passingScore) === null || strictNumber(this.passingScore) < 0 || strictNumber(this.passingScore) > 100) {
      errors.passingScore = 'Passing score must be between 0 and 100.';
    }
    if (this.attemptLimit === undefined || this.attemptLimit === null || this.attemptLimit === '') {
      errors.attemptLimit = 'Attempt limit is required.';
    } else if (!Number.isInteger(strictNumber(this.attemptLimit)) || strictNumber(this.attemptLimit) < 1) {
      errors.attemptLimit = 'Attempt limit must be an integer greater than zero.';
    }
    return errors;
  }

  toObject() {
    return {
      title: this.title,
      lessonId: this.lessonId,
      timeLimit: strictNumber(this.timeLimit),
      passingScore: strictNumber(this.passingScore),
      ...(this.attemptLimit !== undefined ? { attemptLimit: strictNumber(this.attemptLimit) } : {}),
    };
  }
}

module.exports = CreateQuizDTO;
