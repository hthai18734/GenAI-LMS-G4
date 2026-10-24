const { COURSE_STATUS, COURSE_STATUSES } = require('../../domain/learning/CourseStatus');

class AdminDashboardService {
  constructor({ userRepository, teacherApplicationRepository, courseRepository, categoryRepository } = {}) {
    this.userRepository = userRepository;
    this.teacherApplicationRepository = teacherApplicationRepository;
    this.courseRepository = courseRepository;
    this.categoryRepository = categoryRepository;
  }
  async getDashboard() {
    const [totalUsers, totalStudents, totalTeachers, totalAdmins, pendingApps, approvedApps,
      rejectedApps, courseAgg, totalCategories, recentApplications, recentPendingCourses,
      recentUsers] = await Promise.all([
      this.userRepository.countByRole(),
      this.userRepository.countByRole('student'),
      this.userRepository.countByRole('teacher'),
      this.userRepository.countByRole('admin'),
      this.teacherApplicationRepository.countByStatus('pending'),
      this.teacherApplicationRepository.countByStatus('approved'),
      this.teacherApplicationRepository.countByStatus('rejected'),
      this.courseRepository.countByStatus(),
      this.categoryRepository.countActiveRecords(),
      this.teacherApplicationRepository.findRecent(),
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
        applications: { pending: pendingApps, approved: approvedApps, rejected: rejectedApps, total: pendingApps + approvedApps + rejectedApps },
        courses: courseCounts,
        categories: { total: totalCategories },
      },
      recentApplications,
      recentPendingCourses,
      recentUsers,
    };
  }
}

module.exports = AdminDashboardService;
