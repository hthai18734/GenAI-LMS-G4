const { hasOwn } = require('../common/DTOUtil');
class AssignmentSettingsDTO {
  constructor(body = {}) { this.body = body; }
  validate() {
    const b = this.body, errors = {};
    if (hasOwn(b, 'deadline') && b.deadline !== null && !validDeadline(b.deadline)) errors.deadline = 'Deadline must be a valid ISO timestamp with timezone, or null.';
    if (hasOwn(b, 'maxScore') && b.maxScore !== null && (typeof b.maxScore !== 'number' || !Number.isFinite(b.maxScore) || b.maxScore < 0.000001 || b.maxScore > 1000000)) errors.maxScore = 'Maximum score must be between 0.000001 and 1000000.';
    if (hasOwn(b, 'passingScore') && b.passingScore !== null && (typeof b.passingScore !== 'number' || !Number.isFinite(b.passingScore) || b.passingScore < 0 || (b.maxScore != null && b.passingScore > b.maxScore))) errors.passingScore = 'Passing score must be within the assessment scale.';
    return errors;
  }
  toObject() {
    const out = {};
    for (const key of ['deadline', 'maxScore', 'passingScore']) if (hasOwn(this.body, key)) out[key] = key === 'deadline' && this.body[key] !== null ? new Date(this.body[key]).toISOString() : this.body[key];
    return out;
  }
}
function validDeadline(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(calendar.getTime()) && calendar.toISOString().slice(0, 10) === value.slice(0, 10);
}
module.exports = AssignmentSettingsDTO;
