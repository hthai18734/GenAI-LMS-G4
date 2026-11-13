const test = require('node:test');
const assert = require('node:assert/strict');
const AdminDashboardService = require('../../src/service/admin/AdminDashboardService');

test('admin dashboard reports users, courses and categories without teacher applications', async () => {
  const recentUsers = [{ fullName: 'Student' }];
  const recentPendingCourses = [{ title: 'Course' }];
  const service = new AdminDashboardService({
    userRepository: {
      countByRole: async (role) => ({ student: 8, teacher: 2, admin: 1 }[role] ?? 11),
      findRecent: async () => recentUsers,
    },
    courseRepository: {
      countByStatus: async () => [{ _id: 'PUBLIC', count: 3 }, { _id: 'PENDING_REVIEW', count: 1 }],
      findRecentByStatus: async (status) => {
        assert.equal(status, 'PENDING_REVIEW');
        return recentPendingCourses;
      },
    },
    categoryRepository: { countActiveRecords: async () => 5 },
  });
  const result = await service.getDashboard();
  assert.deepEqual(result.metrics.users, { total: 11, students: 8, teachers: 2, admins: 1 });
  assert.equal(result.metrics.courses.total, 4);
  assert.equal(result.metrics.courses.PUBLIC, 3);
  assert.equal(result.metrics.categories.total, 5);
  assert.deepEqual(result.recentUsers, recentUsers);
  assert.deepEqual(result.recentPendingCourses, recentPendingCourses);
  assert.equal('applications' in result.metrics, false);
  assert.equal('recentApplications' in result, false);
});
