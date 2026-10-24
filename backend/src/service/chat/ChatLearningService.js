const ServiceError = require('../common/ServiceError');
const levels = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const short = (value, max = 600) => String(value || '').slice(0, max);
function parseJson(text) {
  try {
    const result = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Expected object');
    return result;
  }
  catch { throw new ServiceError(502, 'AI returned invalid data. Please try again.'); }
}
function validText(value, max = 1200) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
const escapeMd = text => String(text).replace(/[\\`*_{}\[\]<>#|]/g, '\\$&');

class ChatLearningService {
  constructor(source) { this.source = source; }

  async prepare(user, input) {
    if (input.mode === 'wrong_answer') return {
      instruction: 'Analyze the question and answer in the user data. Respond in four sections: Feedback; Mistakes and reasons; Step-by-step solution; Practice question. Do not assume the answer is incorrect. Confirm it if it is correct. The reference answer was supplied by the user and has not been graded by the system. State any missing information or conflict with the lesson; do not invent scores or quiz results.',
      data: input.details,
      finish: text => ({ answer: text, mode: input.mode }),
    };
    if (!['recommend', 'study_plan'].includes(input.mode)) return null;
    const [catalog, enrollments, quizPerformance] = await Promise.all([
      this.source.catalog(),
      this.source.enrollments(user._id),
      this.source.quizPerformance ? this.source.quizPerformance(user._id) : [],
    ]);
    const statuses = new Map(enrollments.map(e => [String(e.courseId), e.status]));
    const activeCourseIds = enrollments.filter(e => e.status === 'active').map(e => e.courseId);
    const lessons = this.source.lessons ? await this.source.lessons(activeCourseIds) : [];
    const words = normalize(input.details.goal).split(/\W+/).filter(w => w.length > 2);
    const candidates = catalog.filter(c => input.mode !== 'recommend' || !statuses.has(String(c._id)))
      .map(c => ({ c, score: words.reduce((sum, word) => sum + (normalize(`${c.title} ${c.category} ${c.description}`).includes(word) ? 1 : 0), 0) }))
      .sort((a, b) => b.score - a.score).slice(0, 20).map(({ c }) => ({
        id: String(c._id), title: short(c.title, 200), description: short(c.description), category: short(c.category, 100),
        durationMinutes: c.duration, price: c.price, enrollment: statuses.get(String(c._id)) || 'not_enrolled',
      }));
    const data = {
      profile: {
        role: user.role,
        level: input.details.level,
        activeCourses: enrollments.filter(e => e.status === 'active').length,
        completedCourses: enrollments.filter(e => e.status === 'completed').length,
        quizPerformance: quizPerformance.map(item => ({ courseId: String(item.courseId), averageScore: item.averageScore, latestScore: item.latestScore, attempts: item.attempts })),
      },
      request: input.details,
      courses: candidates,
      lessons: lessons.map(lesson => ({
        id: String(lesson._id), courseId: String(lesson.courseId), title: short(lesson.title, 200),
        summary: short(lesson.content, 600), durationMinutes: lesson.duration, order: lesson.order,
      })),
    };
    if (input.mode === 'recommend') return {
      data,
      instruction: 'Return only valid JSON in the form {"recommendations":[{"kind":"course","courseId":"id from courses","reason":"why it fits"},{"kind":"lesson","lessonId":"id from lessons","reason":"why it fits"}]}. Select at most 3 suitable entries total. Course recommendations must come from courses; lesson recommendations must come from lessons and are allowed only for active enrolled courses. Do not invent IDs. Return an empty array if none fit. Use the goal, level, enrollment history, and quiz performance when present, but never infer missing scores. Write reasons in the language of the learning goal. Keep JSON keys unchanged.',
      finish: text => {
        const result = parseJson(text);
        if (!Array.isArray(result.recommendations) || result.recommendations.length > 3) throw new ServiceError(502, 'AI returned an invalid recommendation list. Please try again.');
        const seen = new Set();
        const recommendations = result.recommendations.map(item => {
          const lesson = item?.kind === 'lesson' ? data.lessons.find(row => row.id === item.lessonId) : null;
          const course = lesson ? null : candidates.find(c => c.id === item?.courseId);
          const key = lesson ? `lesson:${lesson.id}` : `course:${course?.id}`;
          if ((!lesson && !course) || seen.has(key) || !validText(item.reason, 800)) throw new ServiceError(502, 'AI recommended an invalid course or lesson. Please try again.');
          seen.add(key);
          if (lesson) return { id: lesson.id, kind: 'lesson', courseId: lesson.courseId, title: lesson.title, reason: item.reason.trim(), url: `/courses/${lesson.courseId}/learn` };
          return { id: course.id, kind: 'course', courseId: course.id, title: course.title, reason: item.reason.trim(), price: course.price, url: `/courses/${course.id}` };
        });
        return { mode: input.mode, recommendations, answer: recommendations.length
          ? `### Recommended Courses and Lessons\n\n${recommendations.map((c, i) => `${i + 1}. **${escapeMd(c.title)}** · ${c.kind === 'lesson' ? 'Lesson' : 'Course'}\n\n   ${escapeMd(c.reason)}\n\n   [Open ${c.kind}](${c.url})`).join('\n\n')}`
          : 'No suitable courses or lessons were found. Try a different learning goal.' };
      },
      ...(candidates.length || data.lessons.length ? {} : { immediate: { mode: input.mode, recommendations: [], answer: 'There are no new courses or accessible lessons available to recommend.' } }),
    };
    const { weeks, daysPerWeek, minutesPerDay } = input.details;
    return {
      data,
      instruction: `Return only valid JSON in the form {"weeks":[{"week":1,"focus":"topic","activities":"tasks by session","outcome":"self-check outcome","courseId":null}]}. Include exactly ${weeks} weeks, numbered consecutively from 1. Describe ${daysPerWeek} sessions per week, each lasting ${minutesPerDay} minutes. Limit each text field to 1200 characters. courseId must come from courses or be null; do not invent courses outside the list. Progress gradually from the current level and include revision. Do not promise mastery or full course completion when the time budget is insufficient. If the catalog is empty, create a self-study plan. Write text fields in the language requested by the user, or otherwise in the language of their learning goal. Keep JSON keys unchanged.`,
      finish: text => {
        const result = parseJson(text);
        if (!Array.isArray(result.weeks) || result.weeks.length !== weeks) throw new ServiceError(502, 'The AI plan does not contain the requested number of weeks. Please try again.');
        const schedule = result.weeks.map((week, index) => {
          if (!week || week.week !== index + 1 || !['focus', 'activities', 'outcome'].every(key => validText(week[key]))) throw new ServiceError(502, 'AI returned invalid study plan content. Please try again.');
          const course = week.courseId == null ? null : candidates.find(c => c.id === week.courseId);
          if (week.courseId != null && !course) throw new ServiceError(502, 'The plan contains an invalid course. Please try again.');
          return { week: index + 1, focus: week.focus.trim(), activities: week.activities.trim(), outcome: week.outcome.trim(), days: daysPerWeek, minutesPerDay,
            ...(course ? { course: { id: course.id, title: course.title, url: `/courses/${course.id}` } } : {}) };
        });
        const studyPlan = { goal: input.details.goal, level: input.details.level, weeks: schedule, totalMinutes: weeks * daysPerWeek * minutesPerDay };
        const answer = `### Study Plan\n\n**Goal:** ${escapeMd(studyPlan.goal)}\n\n**Level:** ${levels[studyPlan.level]} · **Time budget:** ${weeks} weeks × ${daysPerWeek} sessions × ${minutesPerDay} minutes = ${studyPlan.totalMinutes} minutes.\n\n${schedule.map(w => `#### Week ${w.week}: ${escapeMd(w.focus)}\n\n${escapeMd(w.activities)}\n\n**Self-check:** ${escapeMd(w.outcome)}${w.course ? `\n\n[${escapeMd(w.course.title)}](${w.course.url})` : ''}`).join('\n\n')}`;
        return { mode: input.mode, studyPlan, answer };
      },
    };
  }
}
module.exports = ChatLearningService;
