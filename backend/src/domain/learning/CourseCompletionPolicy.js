const id = value => String(value?._id || value);
const latestFirst = (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0) || id(b._id).localeCompare(id(a._id));

function activeActivities({ lessons = [], quizzes = [], assignments = [] } = {}) {
  const publishedLessons = lessons.filter(l => !l.deletedAt && l.isPublished === true);
  const lessonIds = new Set(publishedLessons.map(l => id(l._id)));
  const accessible = item => !item.deletedAt && (!item.lessonId || lessonIds.has(id(item.lessonId)));
  return {
    lessons: publishedLessons,
    quizzes: quizzes.filter(q => q.isPublished === true && accessible(q)),
    assignments: assignments.filter(accessible),
  };
}

// Shared by live student progress, certificate eligibility and the teacher report.
// Deadlines govern acceptance at submission time, not retrospective invalidation.
function evaluateCompletion(data = {}) {
  const { lessons, quizzes, assignments } = activeActivities(data);
  const { progressRecords = [], videos = [], attempts = [], submissions = [] } = data;
  const completedLessons = new Set(progressRecords.filter(p => p.status === 'completed').map(p => id(p.lessonId)));
  const remainingActivities = [];
  let lessonCount = 0;
  for (const lesson of lessons) {
    const video = videos.find(v => id(v.lessonId) === id(lesson._id));
    const watched = !lesson.videoRef || video?.completed || Number(video?.watchedPercent) >= 90;
    if (completedLessons.has(id(lesson._id)) && watched) lessonCount++;
    else remainingActivities.push(`Lesson: ${lesson.title}`);
  }
  const cells = assignments.map(assignment => {
    const submission = submissions.filter(s => id(s.assignmentId) === id(assignment._id)).sort(latestFirst)[0];
    const numeric = submission?.score != null;
    const configured = assignment.passingScore != null;
    const passed = !submission ? false : numeric
      ? configured && Number.isFinite(submission.score) && submission.score >= assignment.passingScore
        && submission.score >= 0 && submission.maxScore > 0 && submission.score <= submission.maxScore
      : submission.status === 'passed';
    const state = !submission ? 'not_submitted' : numeric && !configured ? 'needs_threshold'
      : passed ? 'passed' : numeric || submission.status === 'needs_revision' ? 'not_passed' : 'ungraded';
    if (!passed) remainingActivities.push(`Assignment: ${assignment.title}`);
    return { key: `assignment:${assignment._id}`, score: submission?.score ?? null, maxScore: submission?.maxScore ?? assignment.maxScore ?? null,
      state, passed, status: submission?.status || null, submissionId: submission ? id(submission._id) : null,
      submittedAt: submission?.submittedAt || null, revision: submission?.revision || 0 };
  });
  for (const quiz of quizzes) {
    const attempt = attempts.filter(a => id(a.quizId) === id(quiz._id) && a.status === 'submitted').sort(latestFirst)[0];
    const passed = Boolean(attempt && Number.isFinite(attempt.score) && Number.isFinite(quiz.passingScore)
      && attempt.score >= quiz.passingScore && attempt.score >= 0 && attempt.score <= 100);
    if (!passed) remainingActivities.push(`Quiz: ${quiz.title}`);
    cells.push({ key: `quiz:${quiz._id}`, score: attempt?.score ?? null, maxScore: 100, passed,
      state: !attempt ? 'not_submitted' : passed ? 'passed' : 'not_passed',
      attemptId: attempt ? id(attempt._id) : null, submittedAt: attempt?.submittedAt || null });
  }
  const summary = (completed, total) => ({ completed, total, ratio: total ? completed / total : 0 });
  const byType = {
    LESSON: summary(lessonCount, lessons.length),
    QUIZ: summary(cells.filter(c => c.key.startsWith('quiz:') && c.passed).length, quizzes.length),
    ASSIGNMENT: summary(cells.filter(c => c.key.startsWith('assignment:') && c.passed).length, assignments.length),
  };
  // Existing learning-progress percentages are activity completion ratios, not grades.
  const weights = { LESSON: 40, QUIZ: 30, ASSIGNMENT: 30 };
  const present = Object.entries(byType).filter(([, value]) => value.total);
  const weightTotal = present.reduce((sum, [type]) => sum + weights[type], 0);
  const percentage = weightTotal ? Math.round(present.reduce((sum, [type, value]) => sum + value.ratio * weights[type], 0) / weightTotal * 10000) / 100 : 0;
  const totalRequired = lessons.length + quizzes.length + assignments.length;
  const completedRequired = Object.values(byType).reduce((sum, value) => sum + value.completed, 0);
  return { percentage, byType, totalRequired, completedRequired,
    eligibleToComplete: totalRequired > 0 && completedRequired === totalRequired, remainingActivities, cells };
}
module.exports = { activeActivities, evaluateCompletion };
