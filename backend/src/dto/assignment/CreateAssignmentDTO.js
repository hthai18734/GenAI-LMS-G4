const { text, objectId, unknownFields, isObjectPayload } = require('../common/DTOUtil');

class CreateAssignmentDTO {
  constructor(body = {}) {
    this.payloadIsObject = isObjectPayload(body);
    this.body = this.payloadIsObject ? body : {};
    body = this.body;
    this.title = text(body.title);
    this.content = text(body.content);
    this.lessonId = body.lessonId === undefined || body.lessonId === null || body.lessonId === '' ? null : body.lessonId;
  }

  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Request body must be an object.';
    const unknown = unknownFields(this.body, ['title', 'content', 'lessonId']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!this.title) errors.title = 'Assignment title is required.';
    else if (this.title.length > 200) errors.title = 'Assignment title must not exceed 200 characters.';
    if (!this.content) errors.content = 'Assignment content is required.';
    if (this.lessonId !== null && (typeof this.lessonId !== 'string' || !objectId(this.lessonId))) errors.lessonId = 'Lesson ID is invalid.';
    return errors;
  }

  toObject() {
    return { title: this.title, content: this.content, lessonId: this.lessonId };
  }
}

module.exports = CreateAssignmentDTO;
