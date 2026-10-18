const ServiceError = require('../../service/common/ServiceError');

const types = ['course_outline', 'lesson_content', 'quiz_questions', 'supporting_content', 'material_summary'];

function text(value, label, max, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new ServiceError(400, `${label} must contain 1 to ${max} characters.`);
  }
  return value.trim();
}

module.exports = {
  types,
  parse(body = {}) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || !types.includes(body.type)) {
      throw new ServiceError(400, 'Invalid AI content generation type.');
    }
    const result = {
      type: body.type,
      source: text(body.source, 'Source content', 20000),
      language: text(body.language || 'English', 'Language', 40),
      audience: text(body.audience || 'General learners', 'Target audience', 200),
      instructions: text(body.instructions, 'Additional instructions', 1000, true),
    };
    if (body.type === 'quiz_questions') {
      const count = Number(body.count ?? 5);
      if (!Number.isInteger(count) || count < 1 || count > 20) throw new ServiceError(400, 'Question count must be between 1 and 20.');
      result.count = count;
      result.difficulty = text(body.difficulty || 'medium', 'Difficulty', 30);
    }
    if (body.type === 'supporting_content') {
      result.contentKind = text(body.contentKind || 'assignment', 'Supporting content type', 40);
    }
    return result;
  },
};
