
class TeacherDashboardService {
  constructor({ courseRepository, enrollmentRepository } = {}) {
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
  }
  async getDashboard(teacherId) {
    const courses = await this.courseRepository.findDashboardCourses(teacherId);
    const courseCounts = courses.reduce((counts, course) => {
      if (course.status) counts[course.status] = (counts[course.status] || 0) + 1;
      return counts;
    }, {});
    const courseIds = courses.map((course) => course._id);
    const [recentEnrollments, activeStudents, completedStudents] = await Promise.all([
      this.enrollmentRepository.findRecentByCourseIds(courseIds),
      this.enrollmentRepository.countByCourseIdsAndStatus(courseIds, 'active'),
      this.enrollmentRepository.countByCourseIdsAndStatus(courseIds, 'completed'),
    ]);
    const recordedStudents = courses.reduce((total, course) => total + (course.totalStudents || 0), 0);

    return {
      metrics: {
        totalCourses: courses.length,
        publishedCourses: courseCounts.PUBLIC || 0,
        pendingCourses: courseCounts.PENDING_REVIEW || 0,
        approvedCourses: courseCounts.APPROVED || 0,
        draftCourses: courseCounts.DRAFT || 0,
        rejectedCourses: courseCounts.REJECTED || 0,
        archivedCourses: courseCounts.ARCHIVED || 0,
        totalStudents: recordedStudents || activeStudents + completedStudents,
        activeStudents,
        completedStudents,
      },
      courses: courses.slice(0, 5),
      recentEnrollments,
    };
  }
}

module.exports = TeacherDashboardService;
