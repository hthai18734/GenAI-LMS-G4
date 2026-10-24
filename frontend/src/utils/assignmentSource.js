const lessonId = lesson => lesson?._id || lesson?.id || '';

export function buildLessonAssignmentSource(course, lesson) {
  if (!course || !lessonId(lesson)) throw new Error('Select a lesson before generating the assignment.');
  return [
    `Course: ${course.title}`,
    `Lesson: ${lesson.title}`,
    `Duration: ${lesson.duration || 0} minutes`,
    '',
    'Create a practical assignment based only on this lesson:',
    lesson.content || '(This lesson has no content yet.)',
  ].join('\n');
}

export function buildLessonAssignmentPlans(course, lessons) {
  if (!course) throw new Error('Select a course before generating assignments.');
  if (!lessons.length) throw new Error('This course has no lessons to create assignments from.');
  return lessons.map((lesson, index) => ({
    lessonId: lessonId(lesson),
    lessonTitle: lesson.title,
    title: `Assignment ${String(index + 1).padStart(2, '0')} – ${lesson.title}`,
    source: buildLessonAssignmentSource(course, lesson),
  }));
}
