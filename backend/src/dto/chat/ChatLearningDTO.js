const DTOValidationError = require('../common/DTOValidationError');
const modes = ['wrong_answer', 'recommend', 'study_plan'];
function field(value, label, max, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DTOValidationError(`${label}: must contain 1 to ${max} characters.`);
  return value.trim();
}
function integer(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new DTOValidationError(`${label} must be between ${min} and ${max}.`);
  return value;
}
module.exports = {
  modes,
  parse(mode, value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DTOValidationError('Invalid learning details.');
    if (mode === 'wrong_answer') {
      const details = {
        question: field(value.question, 'Question', 1500),
        studentAnswer: field(value.studentAnswer, 'Your answer', 1000),
        correctAnswer: field(value.correctAnswer, 'Reference answer', 1000, true),
      };
      return { details, text: `Explain the answer\nQuestion: ${details.question}\nMy answer: ${details.studentAnswer}\nReference answer I provided: ${details.correctAnswer || '(not provided)'}` };
    }
    const details = { goal: field(value.goal, 'Goal', 500), level: value.level };
    if (!['beginner', 'intermediate', 'advanced'].includes(details.level)) throw new DTOValidationError('Invalid level.');
    if (mode === 'recommend') return { details, text: `Recommend courses for this goal: ${details.goal}. Level: ${details.level}.` };
    details.weeks = integer(value.weeks, 'Weeks', 1, 12);
    details.daysPerWeek = integer(value.daysPerWeek, 'Days per week', 1, 7);
    details.minutesPerDay = integer(value.minutesPerDay, 'Minutes per day', 15, 180);
    return { details, text: `Create a study plan: ${details.goal}. Level: ${details.level}. ${details.weeks} weeks, ${details.daysPerWeek} days per week, ${details.minutesPerDay} minutes per day.` };
  },
};
