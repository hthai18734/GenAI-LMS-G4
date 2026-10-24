const UserQueryDTO = require('./UserQueryDTO');

class TeacherQueryDTO extends UserQueryDTO {
  validate() {
    const errors = super.validate();
    for (const field of ['page', 'limit']) {
      if (this.query[field] !== undefined && (!/^\d+$/.test(this.query[field]) || !Number.isSafeInteger(Number(this.query[field])) || Number(this.query[field]) < 1 || Number(this.query[field]) > (field === 'limit' ? 100 : 1000000))) errors[field] = `Invalid ${field}.`;
    }
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
