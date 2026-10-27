export const INITIAL_ASSIGNMENT_FORM = Object.freeze({
  courseId: '',
  lessonId: '',
  title: '',
  content: '',
});

const relationId = (value) => String(value?._id || value || '');

export function assignmentToForm(assignment, fallbackCourseId = '') {
  return {
    courseId: relationId(assignment?.courseId) || fallbackCourseId,
    lessonId: relationId(assignment?.lessonId),
    title: assignment?.title || '',
    content: assignment?.content || '',
  };
}

export function validateAssignmentForm(form) {
  const errors = {};
  if (!form.courseId) errors.courseId = 'Please select a course.';
  if (!form.title.trim()) errors.title = 'Assignment title is required.';
  if (!form.content.trim()) errors.content = 'Assignment content is required.';
  return errors;
}

export function assignmentPayload(form) {
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    lessonId: form.lessonId || null,
  };
}
