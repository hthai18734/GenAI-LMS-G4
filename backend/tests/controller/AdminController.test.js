const test = require('node:test');
const assert = require('node:assert/strict');
const AdminController = require('../../src/composition/http').controllers.AdminController;
const UseCases = require('../../src/composition/services');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

test('AdminController: getDashboardStats returns admin statistics', async () => {
  const origGetDashboard = UseCases.adminDashboardService.getDashboard;
  UseCases.adminDashboardService.getDashboard = async () => ({
    metrics: {
      users: { total: 10, students: 8, teachers: 1, admins: 1 },
      applications: { pending: 0, approved: 0, rejected: 0, total: 0 },
      courses: { total: 5 },
      categories: { total: 2 },
    },
    recentApplications: [],
    recentPendingCourses: [],
    recentUsers: [],
  });

  try {
    const req = { user: { _id: 'admin1', role: 'admin' } };
    const res = createMockRes();
    let nextCalled = false;
    await AdminController.getDashboardStats(req, res, (err) => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.metrics.users.total, 10);
    assert.equal(res.body.message, 'Admin dashboard statistics retrieved successfully.');
  } finally {
    UseCases.adminDashboardService.getDashboard = origGetDashboard;
  }
});
