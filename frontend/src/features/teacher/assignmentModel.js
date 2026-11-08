export const INITIAL_ASSIGNMENT_FORM = Object.freeze({
  courseId: '',
  lessonId: '',
  title: '',
  content: '',
  deadline: '', maxScore: '', passingScore: '',
});

const relationId = (value) => String(value?._id || value || '');

export function assignmentToForm(assignment, fallbackCourseId = '') {
  return {
    courseId: relationId(assignment?.courseId) || fallbackCourseId,
    lessonId: relationId(assignment?.lessonId),
    title: assignment?.title || '',
    content: assignment?.content || '',
    deadline: toLocalDateTime(assignment?.deadline), maxScore: assignment?.maxScore ?? '', passingScore: assignment?.passingScore ?? '',
  };
}

export function validateAssignmentForm(form) {
  const errors = {};
  if (!form.courseId) errors.courseId = 'Please select a course.';
  if (!form.title.trim()) errors.title = 'Assignment title is required.';
  if (!form.content.trim()) errors.content = 'Assignment content is required.';
  if (form.deadline && !Number.isFinite(new Date(form.deadline).getTime())) errors.deadline = 'Enter a valid deadline.';
  if (form.maxScore !== '' && form.maxScore !== undefined && (!Number.isFinite(Number(form.maxScore)) || Number(form.maxScore) <= 0)) errors.maxScore = 'Maximum score must be positive.';
  if (form.passingScore !== '' && form.passingScore !== undefined && (form.maxScore === '' || Number(form.passingScore) < 0 || Number(form.passingScore) > Number(form.maxScore))) errors.passingScore = 'Passing score must be within the scale.';
  return errors;
}

export function assignmentPayload(form) {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    lessonId: form.lessonId || null,
    deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    maxScore: form.maxScore === '' || form.maxScore == null ? null : Number(form.maxScore),
    passingScore: form.passingScore === '' || form.passingScore == null ? null : Number(form.passingScore),
  };
}

export function toLocalDateTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
