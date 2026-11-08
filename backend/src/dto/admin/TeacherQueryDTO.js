const UserQueryDTO = require('./UserQueryDTO');

class TeacherQueryDTO extends UserQueryDTO {
  validate() {
    const errors = super.validate();
    if (this.query.teachingStatus && !['active', 'suspended'].includes(this.query.teachingStatus)) errors.teachingStatus = 'Invalid teaching status.';
    return errors;
  }
  toObject() {
    const result = super.toObject();
    result.role = 'teacher';
    result.teachingStatus = this.query.teachingStatus || null;
    return result;
  }
}
module.exports = TeacherQueryDTO;
