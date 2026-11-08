const { isObjectPayload, unknownFields, objectId } = require('../common/DTOUtil');
class SubmissionDTO {
  constructor(body = {}, mode = 'query') { this.valid = isObjectPayload(body); this.body = this.valid ? body : {}; this.mode = mode; }
  validate() {
    const b = this.body, e = {};
    const allowed = this.mode === 'query' ? ['page', 'limit', 'status', 'studentId'] : this.mode === 'feedback' ? ['feedback', 'revision'] : ['score', 'passed', 'feedback', 'revision'];
    if (!this.valid || unknownFields(b, allowed).length) e.payload = 'Unsupported submission fields.';
    if (this.mode === 'query') {
      for (const key of ['page', 'limit']) if (b[key] !== undefined && (!/^\d+$/.test(String(b[key])) || Number(b[key]) < 1 || Number(b[key]) > (key === 'limit' ? 100 : 1000000))) e[key] = 'Invalid pagination.';
      if (b.status && !['submitted', 'graded', 'passed', 'needs_revision'].includes(b.status)) e.status = 'Invalid submission status.';
      if (b.studentId && !objectId(b.studentId)) e.studentId = 'Invalid student ID.';
    } else {
      if (b.revision !== undefined && (!Number.isInteger(b.revision) || b.revision < 0)) e.revision = 'Invalid revision.';
      if (this.mode === 'feedback' || b.feedback !== undefined) if (typeof b.feedback !== 'string' || b.feedback.length > 10000) e.feedback = 'Feedback must be text up to 10000 characters.';
      if (this.mode === 'grade' && b.score === undefined && typeof b.passed !== 'boolean') e.score = 'Provide a numerical score or legacy pass decision.';
      if (b.score !== undefined && (typeof b.score !== 'number' || !Number.isFinite(b.score) || b.score < 0)) e.score = 'Score must be a non-negative number.';
      if (b.score !== undefined && b.passed !== undefined) e.passed = 'Pass is derived from the score.';
    }
    return e;
  }
  toObject() { return this.mode === 'query' ? { ...this.body, page: Number(this.body.page || 1), limit: Number(this.body.limit || 20) } : { ...this.body }; }
}
module.exports = SubmissionDTO;
