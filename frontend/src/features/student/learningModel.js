export function groupCourseSections(sections = [], lessons = []) {
  const groups = new Map(sections.map(section => [String(section.id || section._id), { ...section, id: String(section.id || section._id), lessons: [] }]));
  for (const lesson of lessons) {
    const key = lesson.sectionId ? String(lesson.sectionId) : 'legacy';
    if (!groups.has(key)) groups.set(key, { id: key, title: lesson.sectionTitle || 'General', lessons: [] });
    groups.get(key).lessons.push(lesson);
  }
  return [...groups.values()];
}

export function assignmentClosed(assignment, now = Date.now()) {
  return Boolean(assignment?.deadline && new Date(assignment.deadline).getTime() <= now);
}

export function overallLearningProgress(courses = []) {
  const unique = new Map(courses.filter(c => c.enrollmentStatus !== 'cancelled').map(c => [String(c.courseId || c.id || c._id), c]));
  const values = [...unique.values()];
  const percentage = values.length ? Math.round(values.reduce((sum, c) => sum + Math.min(100, Math.max(0, Number(c.progressPercent) || 0)), 0) / values.length) : 0;
  return { percentage, total: values.length, ready: values.filter(c => c.eligibleToComplete === true).length };
}
