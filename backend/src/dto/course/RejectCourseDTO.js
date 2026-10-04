const { text, unknownFields } = require('../common/DTOUtil');
class RejectCourseDTO {
  constructor(body = {}) {
    this.body = body;
    this.reason = text(body.reason);
  }
  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, ['reason']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!this.reason) errors.reason = 'A rejection reason is required.';
    else if (this.reason.length > 1000)
      errors.reason = 'Rejection reason must not exceed 1000 characters.';
    return errors;
  }
  toObject() {
    return { reason: this.reason };
  }
}
module.exports = RejectCourseDTO;
