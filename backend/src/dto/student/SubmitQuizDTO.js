const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { text, unknownFields, isObjectPayload } = require('../common/DTOUtil');

class SubmitQuizDTO {
  constructor(body = {}) {
    this.payloadIsObject = isObjectPayload(body);
    this.body = this.payloadIsObject ? body : {};
    body = this.body;
    this.answers = Array.isArray(body.answers)
      ? body.answers.map((answer) => ({ questionId: answer?.questionId, answer: text(answer?.answer) }))
      : body.answers;
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Request body must be an object.';
    const unknown = unknownFields(this.body, ['answers']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!Array.isArray(this.answers)) {
      errors.answers = 'Answers are required.';
      return errors;
    }
    const questionIds = new Set();
    this.answers.forEach((entry, index) => {
      if (!entry || typeof entry.questionId !== 'string' || !isValidIdentifier(entry.questionId)) {
        errors[`answers[${index}].questionId`] = 'Question ID is invalid.';
      } else if (questionIds.has(entry.questionId)) {
        errors[`answers[${index}].questionId`] = 'Each question may be answered once.';
      } else {
        questionIds.add(entry.questionId);
      }
      if (!entry?.answer) errors[`answers[${index}].answer`] = 'Answer is required.';
    });
    return errors;
  }

  toObject() { return { answers: this.answers }; }
}

module.exports = SubmitQuizDTO;
