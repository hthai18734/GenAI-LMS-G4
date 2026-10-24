const test = require('node:test');
const assert = require('node:assert/strict');
const TeacherAssignmentController = require('../../src/controller/teacher/TeacherAssignmentController');
const { assignmentService: AssignmentService } = require('../../src/composition/services');

const COURSE_ID = '507f1f77bcf86cd799439011';
const user = { _id: '507f1f77bcf86cd799439012', role: 'teacher' };

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function call(req) {
  const res = response();
  let nextError;
  await TeacherAssignmentController.create(req, res, (error) => { nextError = error; });
  return { res, nextError };
}

test('create assignment returns the SRS validation message and persists no invalid content', async () => {
  const original = AssignmentService.createAssignment;
  let called = false;
  AssignmentService.createAssignment = async () => { called = true; };
  try {
    const { res } = await call({ params: { courseId: COURSE_ID }, user, body: { title: '', content: '' } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid assignment information.');
    assert.ok(res.body.errors.title);
    assert.ok(res.body.errors.content);
    assert.equal(called, false);
  } finally {
    AssignmentService.createAssignment = original;
  }
});

test('create assignment returns 201 and forwards persistence failures to ErrorFilter', async () => {
  const original = AssignmentService.createAssignment;
  try {
    AssignmentService.createAssignment = async () => ({ _id: '507f1f77bcf86cd799439013', courseId: COURSE_ID, title: 'Report', content: 'Write it.' });
    const created = await call({ params: { courseId: COURSE_ID }, user, body: { title: 'Report', content: 'Write it.' } });
    assert.equal(created.res.statusCode, 201);
    assert.equal(created.res.body.message, 'Assignment created successfully.');
    assert.equal(created.res.body.data.assignment.courseId, COURSE_ID);

    const persistenceError = new Error('database unavailable');
    AssignmentService.createAssignment = async () => { throw persistenceError; };
    const failed = await call({ params: { courseId: COURSE_ID }, user, body: { title: 'Report', content: 'Write it.' } });
    assert.equal(failed.nextError, persistenceError);
  } finally {
    AssignmentService.createAssignment = original;
  }
});
