const ServiceError = require('../common/ServiceError');
class GradebookService {
  constructor(dependencies = {}) { Object.assign(this, dependencies); }
  async context(courseId, user) {
    const course = await this.courseService.getOwnedCourse(courseId, user);
    const activities = await this.progressTrackingService.courseActivities(courseId);
    const assessments = [
      ...activities.assignments.map(a => ({ key: `assignment:${a._id}`, id: String(a._id), type: 'assignment', title: a.title, maxScore: a.maxScore ?? null, passingScore: a.passingScore ?? null, deadline: a.deadline || null })),
      ...activities.quizzes.map(q => ({ key: `quiz:${q._id}`, id: String(q._id), type: 'quiz', title: q.title, maxScore: 100, passingScore: q.passingScore, deadline: q.deadline || null })),
    ];
    return { course, activities, assessments };
  }
  async build({ course, activities, assessments }, data, query) {
    const rows = await Promise.all(data.students.map(async student => {
      const progress = await this.progressTrackingService.evaluateCourseProgress(student.id, course._id, activities);
      const { cells, ...completion } = progress;
      return { student, cells, result: { ...completion, status: progress.eligibleToComplete ? 'completed' : 'incomplete' } };
    }));
    return { course: { id: String(course._id), title: course.title }, assessments, rows,
      attemptSelection: 'latest', pagination: { ...query, total: data.total, pages: Math.ceil(data.total / query.limit) } };
  }
  async view(courseId, user, query = { page: 1, limit: 20 }) {
    const context = await this.context(courseId, user);
    return this.build(context, await this.gradebookRepository.read(courseId, query), query);
  }
  async configure(courseId, user) {
    await this.courseService.getOwnedCourse(courseId, user);
    throw new ServiceError(410, 'Weighted grade policies have been retired. Course completion uses lessons, videos and the latest assessment results.');
  }
  async report(courseId, user) {
    const context = await this.context(courseId, user);
    const first = await this.build(context, await this.gradebookRepository.read(courseId, { page: 1, limit: 100 }), { page: 1, limit: 100 });
    for (let page = 2; page <= first.pagination.pages; page++) {
      const next = await this.build(context, await this.gradebookRepository.read(courseId, { page, limit: 100 }), { page, limit: 100 });
      first.rows.push(...next.rows);
    }
    return { ...first, generatedAt: new Date().toISOString(), publication: 'saved-results-visible', format: 'pdf-data' };
  }
}
module.exports = GradebookService;
