const { text, unknownFields, isObjectPayload } = require('../common/DTOUtil');
class RejectCourseDTO {
  constructor(body = {}) {
    this.payloadIsObject = isObjectPayload(body);
    this.body = this.payloadIsObject ? body : {};
    this.reason = text(this.body.reason);
  }
  validate() {
    const errors = {};
    if (!this.payloadIsObject) errors.payload = 'Request body must be an object.';
    const unknown = unknownFields(this.body, ['reason']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!this.reason) errors.reason = 'A rejection reason is required.';
    else if (this.reason.length > 1000) errors.reason = 'Rejection reason must not exceed 1000 characters.';
    return errors;
  }
  toObject() { return { reason: this.reason }; }
}
module.exports = RejectCourseDTO;
