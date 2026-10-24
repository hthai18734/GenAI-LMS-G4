const lessonId = lesson => lesson?._id || lesson?.id || '';

export function buildLessonQuizSource(course, lesson) {
  if (!course || !lessonId(lesson)) throw new Error('Select a lesson before generating the quiz.');
  return [
    `Course: ${course.title}`,
    `Lesson: ${lesson.title}`,
    `Duration: ${lesson.duration || 0} minutes`,
    '',
    'Lesson content:',
    lesson.content || '(This lesson has no content yet.)',
  ].join('\n');
}

export function buildLessonQuizPlans(course, lessons) {
  if (!course) throw new Error('Select a course before generating quizzes.');
  if (!lessons.length) throw new Error('This course has no lessons to create quizzes from.');
  return lessons.map((lesson, index) => ({
    lessonId: lessonId(lesson),
    lessonTitle: lesson.title,
    title: `Quiz ${String(index + 1).padStart(2, '0')} – ${lesson.title}`,
    source: buildLessonQuizSource(course, lesson),
  }));
}
