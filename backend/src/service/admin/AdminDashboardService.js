const { COURSE_STATUS, COURSE_STATUSES } = require('../../domain/learning/CourseStatus');

class AdminDashboardService {
  constructor({ userRepository, courseRepository, categoryRepository } = {}) {
    this.userRepository = userRepository;
    this.courseRepository = courseRepository;
    this.categoryRepository = categoryRepository;
  }
  async getDashboard() {
    const [totalUsers, totalStudents, totalTeachers, totalAdmins,
      courseAgg, totalCategories, recentPendingCourses,
      recentUsers] = await Promise.all([
      this.userRepository.countByRole(),
      this.userRepository.countByRole('student'),
      this.userRepository.countByRole('teacher'),
      this.userRepository.countByRole('admin'),
      this.courseRepository.countByStatus(),
      this.categoryRepository.countActiveRecords(),
      this.courseRepository.findRecentByStatus(COURSE_STATUS.PENDING_REVIEW),
      this.userRepository.findRecent(),
    ]);
    const courseCounts = Object.fromEntries(COURSE_STATUSES.map((status) => [status, 0]));
    courseCounts.total = 0;
    for (const item of courseAgg) {
      if (item._id) courseCounts[item._id] = item.count;
      courseCounts.total += item.count;
    }
    return {
      metrics: {
        users: { total: totalUsers, students: totalStudents, teachers: totalTeachers, admins: totalAdmins },
        applications: { pending: 0, approved: 0, rejected: 0, total: 0 },
        courses: courseCounts,
        categories: { total: totalCategories },
      },
      recentApplications: [],
      recentPendingCourses,
      recentUsers,
    };
  }
}

module.exports = AdminDashboardService;
