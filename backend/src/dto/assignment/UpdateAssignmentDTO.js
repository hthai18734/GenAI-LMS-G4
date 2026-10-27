const { text, hasOwn, objectId, unknownFields, isObjectPayload } = require('../common/DTOUtil');

class UpdateAssignmentDTO {
  constructor(body = {}) {
    this.payloadIsObject = isObjectPayload(body);
    this.body = this.payloadIsObject ? body : {};
  }

  validate() {
    const errors = {};
    const allowed = ['title', 'content', 'lessonId'];
    if (!this.payloadIsObject) errors.payload = 'Request body must be an object.';
    const unknown = unknownFields(this.body, allowed);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!Object.keys(this.body).length) errors.payload = 'At least one editable field is required.';
    if (hasOwn(this.body, 'title') && (!text(this.body.title) || text(this.body.title).length > 200)) {
      errors.title = 'Assignment title must be 1-200 characters.';
    }
    if (hasOwn(this.body, 'content') && !text(this.body.content)) {
      errors.content = 'Assignment content is required.';
    }
    if (hasOwn(this.body, 'lessonId')) {
      const value = this.body.lessonId;
      if (value !== null && value !== '' && (typeof value !== 'string' || !objectId(value))) {
        errors.lessonId = 'Lesson ID is invalid.';
      }
    }
    return errors;
  }

  toObject() {
    const output = {};
    if (hasOwn(this.body, 'title')) output.title = text(this.body.title);
    if (hasOwn(this.body, 'content')) output.content = text(this.body.content);
    if (hasOwn(this.body, 'lessonId')) output.lessonId = this.body.lessonId || null;
    return output;
  }
}

module.exports = UpdateAssignmentDTO;
