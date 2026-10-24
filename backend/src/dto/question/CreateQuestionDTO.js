const { text, unknownFields } = require('../common/DTOUtil');

class CreateQuestionDTO {
  constructor(body = {}) {
    this.body = body;
    this.questionText = text(body.questionText);
    this.options = Array.isArray(body.options) ? body.options.map(text) : body.options;
    this.correctAnswer = text(body.correctAnswer);
  }

  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, ['questionText', 'options', 'correctAnswer', 'explanation']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!this.questionText) errors.questionText = 'Question text is required.';
    if (!Array.isArray(this.options) || this.options.length < 2 || this.options.some((option) => !option)) {
      errors.options = 'At least two non-empty options are required.';
    }
    if (!this.correctAnswer) errors.correctAnswer = 'Correct answer is required.';
    else if (Array.isArray(this.options) && !this.options.includes(this.correctAnswer)) {
      errors.correctAnswer = 'Correct answer must match an option.';
    }
    return errors;
  }

  toObject() {
    return {
      questionText: this.questionText,
      options: this.options,
      correctAnswer: this.correctAnswer,
      ...(Object.prototype.hasOwnProperty.call(this.body, 'explanation') ? { explanation: text(this.body.explanation) || '' } : {}),
    };
  }
}

module.exports = CreateQuestionDTO;
