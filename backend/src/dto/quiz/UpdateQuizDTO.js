const { text, hasOwn, objectId, unknownFields } = require('../common/DTOUtil');

class UpdateQuizDTO {
  constructor(body = {}) { this.body = body; }

  validate() {
    const errors = {};
    const allowed = ['title', 'lessonId', 'timeLimit', 'passingScore', 'attemptLimit'];
    const unknown = unknownFields(this.body, allowed);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!Object.keys(this.body).length) errors.payload = 'At least one editable field is required.';
    if (hasOwn(this.body, 'title') && (!text(this.body.title) || text(this.body.title).length > 200)) {
      errors.title = 'Quiz title must be 1-200 characters.';
    }
    if (hasOwn(this.body, 'lessonId')
      && this.body.lessonId !== null
      && this.body.lessonId !== ''
      && (typeof this.body.lessonId !== 'string' || !objectId(this.body.lessonId))) {
      errors.lessonId = 'Lesson ID is invalid.';
    }
    if (hasOwn(this.body, 'timeLimit') && (!Number.isInteger(Number(this.body.timeLimit)) || Number(this.body.timeLimit) < 1)) {
      errors.timeLimit = 'Time limit must be an integer greater than zero.';
    }
    if (hasOwn(this.body, 'passingScore')
      && (!Number.isFinite(Number(this.body.passingScore)) || Number(this.body.passingScore) < 0 || Number(this.body.passingScore) > 100)) {
      errors.passingScore = 'Passing score must be between 0 and 100.';
    }
    if (hasOwn(this.body, 'attemptLimit') && (!Number.isInteger(Number(this.body.attemptLimit)) || Number(this.body.attemptLimit) < 1)) {
      errors.attemptLimit = 'Attempt limit must be an integer greater than zero.';
    }
    return errors;
  }

  toObject() {
    const result = {};
    if (hasOwn(this.body, 'title')) result.title = text(this.body.title);
    if (hasOwn(this.body, 'lessonId')) result.lessonId = this.body.lessonId === '' ? null : this.body.lessonId;
    if (hasOwn(this.body, 'timeLimit')) result.timeLimit = Number(this.body.timeLimit);
    if (hasOwn(this.body, 'passingScore')) result.passingScore = Number(this.body.passingScore);
    if (hasOwn(this.body, 'attemptLimit')) result.attemptLimit = Number(this.body.attemptLimit);
    return result;
  }
}

module.exports = UpdateQuizDTO;
