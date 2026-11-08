const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const JWTUtil = require('../../src/utils/auth/JWTUtil');
const UserRepository = require('../../src/infrastructure/persistence/mongoose/repositories/identity/UserRepository');
const studentRoutes = require('../../src/routes/studentRoutes');
const adminRoutes = require('../../src/routes/adminRoutes');

test('retired teacher application endpoints return 404 for authenticated users', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/student', studentRoutes);
  app.use('/api/v1/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const originalVerify = JWTUtil.verifyAccessToken;
  const originalFind = UserRepository.findById;
  const user = { _id: '507f1f77bcf86cd799439012', role: 'student', status: 'active', emailVerifiedAt: new Date() };
  try {
    JWTUtil.verifyAccessToken = () => ({ sub: user._id });
    UserRepository.findById = async () => user;
    for (const [role, method, path] of [
      ['student', 'GET', '/api/student/teacher-application'],
      ['student', 'POST', '/api/student/teacher-application'],
      ['admin', 'GET', '/api/v1/admin/teacher-applications'],
      ['admin', 'POST', '/api/v1/admin/teacher-applications/507f1f77bcf86cd799439011/approve'],
      ['admin', 'POST', '/api/v1/admin/teacher-applications/507f1f77bcf86cd799439011/reject'],
    ]) {
      user.role = role;
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({ bio: 'Teaching experience', reason: 'Rejected' }) } : {}),
      });
      await response.text();
      assert.equal(response.status, 404, `${method} ${path}`);
      assert.equal(user.role, role);
    }
  } finally {
    JWTUtil.verifyAccessToken = originalVerify;
    UserRepository.findById = originalFind;
    await new Promise((resolve) => server.close(resolve));
  }
});
