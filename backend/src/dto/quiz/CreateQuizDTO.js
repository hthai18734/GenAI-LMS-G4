const { text, objectId, unknownFields } = require('../common/DTOUtil');

class CreateQuizDTO {
  constructor(body = {}) {
    this.body = body;
    this.title = text(body.title);
    this.lessonId = body.lessonId === undefined || body.lessonId === null || body.lessonId === '' ? null : body.lessonId;
    this.timeLimit = body.timeLimit;
    this.passingScore = body.passingScore;
    this.attemptLimit = body.attemptLimit;
  }

  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, ['title', 'lessonId', 'timeLimit', 'passingScore', 'attemptLimit']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!this.title) errors.title = 'Quiz title is required.';
    else if (this.title.length > 200) errors.title = 'Quiz title must not exceed 200 characters.';
    if (this.lessonId !== null && (typeof this.lessonId !== 'string' || !objectId(this.lessonId))) {
      errors.lessonId = 'Lesson ID is invalid.';
    }
    if (!Number.isInteger(Number(this.timeLimit)) || Number(this.timeLimit) < 1) {
      errors.timeLimit = 'Time limit must be an integer greater than zero.';
    }
    if (!Number.isFinite(Number(this.passingScore)) || Number(this.passingScore) < 0 || Number(this.passingScore) > 100) {
      errors.passingScore = 'Passing score must be between 0 and 100.';
    }
    if (this.attemptLimit === undefined || this.attemptLimit === null || this.attemptLimit === '') {
      errors.attemptLimit = 'Attempt limit is required.';
    } else if (!Number.isInteger(Number(this.attemptLimit)) || Number(this.attemptLimit) < 1) {
      errors.attemptLimit = 'Attempt limit must be an integer greater than zero.';
    }
    return errors;
  }

  toObject() {
    return {
      title: this.title,
      lessonId: this.lessonId,
      timeLimit: Number(this.timeLimit),
      passingScore: Number(this.passingScore),
      ...(this.attemptLimit !== undefined ? { attemptLimit: Number(this.attemptLimit) } : {}),
    };
  }
}

module.exports = CreateQuizDTO;
