const { text, hasOwn, objectId, unknownFields } = require('../common/DTOUtil');

class UpdateQuestionDTO {
  constructor(body = {}) { this.body = body; }

  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, ['questionText', 'options', 'correctAnswer', 'explanation', 'categoryId']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (hasOwn(this.body, 'categoryId') && this.body.categoryId !== null && this.body.categoryId !== ''
      && (typeof this.body.categoryId !== 'string' || !objectId(this.body.categoryId))) {
      errors.categoryId = 'Category ID is invalid.';
    }
    if (!Object.keys(this.body).length) errors.payload = 'At least one editable field is required.';
    if (hasOwn(this.body, 'questionText') && !text(this.body.questionText)) {
      errors.questionText = 'Question text is required.';
    }
    if (hasOwn(this.body, 'options')) {
      const options = Array.isArray(this.body.options) ? this.body.options.map(text) : null;
      if (!options || options.length < 2 || options.some((option) => !option)) {
        errors.options = 'At least two non-empty options are required.';
      }
    }
    if (hasOwn(this.body, 'correctAnswer') && !text(this.body.correctAnswer)) {
      errors.correctAnswer = 'Correct answer is required.';
    }
    return errors;
  }

  toObject() {
    const result = {};
    if (hasOwn(this.body, 'categoryId')) result.categoryId = this.body.categoryId || null;
    if (hasOwn(this.body, 'questionText')) result.questionText = text(this.body.questionText);
    if (hasOwn(this.body, 'options')) result.options = Array.isArray(this.body.options) ? this.body.options.map(text) : this.body.options;
    if (hasOwn(this.body, 'correctAnswer')) result.correctAnswer = text(this.body.correctAnswer);
    if (hasOwn(this.body, 'explanation')) result.explanation = text(this.body.explanation) || '';
    return result;
  }
}

module.exports = UpdateQuestionDTO;
