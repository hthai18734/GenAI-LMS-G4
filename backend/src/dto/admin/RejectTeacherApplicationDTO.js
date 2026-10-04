const { text, unknownFields } = require('../common/DTOUtil');

class RejectTeacherApplicationDTO {
  constructor(params = {}, body = {}, user = {}) {
    this.body = body || {};
    this.applicationId = text(params.id || params.applicationId);
    this.reason = text(body ? body.reason : '');
    this.adminUser = user;
  }

  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, ['reason']);
    if (unknown.length) {
      errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    }

    if (!this.reason || this.reason.length === 0) {
      errors.reason = 'Reason required';
    } else if (this.reason.length > 1000) {
      errors.reason = 'Rejection reason must not exceed 1000 characters.';
    }

    if (!this.applicationId) {
      errors.applicationId = 'Application ID is required.';
    }

    return errors;
  }

  toObject() {
    return {
      applicationId: this.applicationId,
      reason: this.reason,
      adminId: this.adminUser?._id || null,
    };
  }
}

module.exports = RejectTeacherApplicationDTO;
