const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const JWTUtil = require('../../src/utils/auth/JWTUtil');
const UserRepository = require('../../src/infrastructure/persistence/mongoose/repositories/identity/UserRepository');
const { assignmentService: AssignmentService } = require('../../src/composition/services');
const ErrorFilter = require('../../src/filter/ErrorFilter');
const routes = require('../../src/routes/teacherRoutes');

const COURSE_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';

test('teacher assignment route rejects unauthenticated and non-teacher requests, and reports persistence errors', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/teacher', routes);
  app.use(ErrorFilter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/teacher/courses/${COURSE_ID}/assignments`;
  const originals = {
    verify: JWTUtil.verifyAccessToken,
    findUser: UserRepository.findById,
    createAssignment: AssignmentService.createAssignment,
  };
  try {
    const unauthenticated = await fetch(url, { method: 'POST' });
    assert.equal(unauthenticated.status, 401);
    assert.equal((await unauthenticated.json()).message, 'Please log in to continue.');

    JWTUtil.verifyAccessToken = () => ({ sub: USER_ID });
    UserRepository.findById = async () => ({ _id: USER_ID, role: 'student', status: 'active', emailVerifiedAt: new Date() });
    const notTeacher = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Report', content: 'Write it.' }),
    });
    assert.equal(notTeacher.status, 403);
    assert.equal((await notTeacher.json()).message, 'You do not have permission to perform this action.');

    UserRepository.findById = async () => ({ _id: USER_ID, role: 'teacher', status: 'active', emailVerifiedAt: new Date() });
    AssignmentService.createAssignment = async () => { throw new Error('database unavailable'); };
    const failed = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Report', content: 'Write it.' }),
    });
    assert.equal(failed.status, 500);
    assert.equal((await failed.json()).message, 'Internal server error.');
  } finally {
    JWTUtil.verifyAccessToken = originals.verify;
    UserRepository.findById = originals.findUser;
    AssignmentService.createAssignment = originals.createAssignment;
    await new Promise((resolve) => server.close(resolve));
  }
});
