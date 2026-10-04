const { text } = require('../common/DTOUtil');

class ApproveTeacherApplicationDTO {
  constructor(params = {}, user = {}) {
    this.applicationId = text(params.id || params.applicationId);
    this.adminUser = user;
  }

  validate() {
    const errors = {};
    if (!this.applicationId) {
      errors.applicationId = 'Application ID is required.';
    }
    return errors;
  }

  toObject() {
    return {
      applicationId: this.applicationId,
      adminId: this.adminUser?._id || null,
    };
  }
}

module.exports = ApproveTeacherApplicationDTO;
