export const BLANK_QUESTION = Object.freeze({
  questionText: '', options: ['', ''], correctAnswer: '', explanation: '', categoryId: '',
});

export const relationId = (value) => String(value?._id || value || '');

export function normalizeQuestion(question) {
  if (question.explanation || !question.questionText?.includes('\n\nExplanation:')) return question;
  const [questionText, ...explanation] = question.questionText.split('\n\nExplanation:');
  return { ...question, questionText, explanation: explanation.join('\n\nExplanation:').trim() };
}

export function quizToForm(quiz) {
  return {
    title: quiz?.title || '',
    lessonId: relationId(quiz?.lessonId),
    timeLimit: String(quiz?.timeLimit ?? ''),
    passingScore: String(quiz?.passingScore ?? ''),
    attemptLimit: String(quiz?.attemptLimit ?? '1'),
  };
}

export function validateQuiz(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Quiz title is required.';
  if (!Number.isInteger(Number(form.timeLimit)) || Number(form.timeLimit) < 1) errors.timeLimit = 'Enter a whole number greater than zero.';
  if (!Number.isFinite(Number(form.passingScore)) || Number(form.passingScore) < 0 || Number(form.passingScore) > 100) errors.passingScore = 'Enter a score from 0 to 100.';
  if (!form.attemptLimit || !Number.isInteger(Number(form.attemptLimit)) || Number(form.attemptLimit) < 1) errors.attemptLimit = 'Attempt limit is required (at least 1).';
  return errors;
}

export function quizPayload(form) {
  return {
    title: form.title.trim(),
    lessonId: form.lessonId || null,
    timeLimit: Number(form.timeLimit),
    passingScore: Number(form.passingScore),
    attemptLimit: Number(form.attemptLimit),
  };
}

export function validateQuestion(question) {
  const errors = {};
  const options = question.options.map((option) => option.trim()).filter(Boolean);
  if (!question.questionText.trim()) errors.questionText = 'Question text is required.';
  if (options.length < 2 || options.length !== question.options.length) errors.options = 'Provide at least two non-empty options.';
  if (!question.correctAnswer || !options.includes(question.correctAnswer)) errors.correctAnswer = 'Choose a correct answer from the options.';
  return { errors, options };
}
