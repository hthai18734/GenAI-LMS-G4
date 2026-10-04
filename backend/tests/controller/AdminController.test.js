const test = require('node:test');
const assert = require('node:assert/strict');
const AdminController = require('../../src/controller/admin/AdminController');
const TeacherApplicationDAO = require('../../src/dao/governance/TeacherApplicationDAO');
const UserDAO = require('../../src/dao/identity/UserDAO');
const NotificationDAO = require('../../src/dao/engagement/NotificationDAO');
const EmailUtil = require('../../src/utils/email/EmailUtil');

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

test('UC-5.1: approveTeacherApplication rejects 404 when application not found', async () => {
  const origFind = TeacherApplicationDAO.findById;
  TeacherApplicationDAO.findById = async () => null;

  try {
    const req = { params: { id: 'app1' }, user: { _id: 'admin1' } };
    const res = createMockRes();
    await AdminController.approveTeacherApplication(req, res, () => {});

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Teacher application not found.');
  } finally {
    TeacherApplicationDAO.findById = origFind;
  }
});

test('UC-5.1: approveTeacherApplication rejects 400 when already processed', async () => {
  const origFind = TeacherApplicationDAO.findById;
  TeacherApplicationDAO.findById = async () => ({
    _id: 'app1',
    status: 'approved',
    userId: { _id: 'u1', email: 'test@example.com' },
  });

  try {
    const req = { params: { id: 'app1' }, user: { _id: 'admin1' } };
    const res = createMockRes();
    await AdminController.approveTeacherApplication(req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /already approved/);
  } finally {
    TeacherApplicationDAO.findById = origFind;
  }
});

test('UC-5.1: approveTeacherApplication successfully approves, upgrades role, notifies, and emails', async () => {
  const origFind = TeacherApplicationDAO.findById;
  const origUpdateStatus = TeacherApplicationDAO.updateStatus;
  const origUpdateRole = UserDAO.updateRole;
  const origCreateNotif = NotificationDAO.create;
  const origSendEmail = EmailUtil.sendApplicationNotification;

  let roleUpdated = null;
  let statusUpdated = null;
  let notifCreated = null;
  let emailSent = null;

  TeacherApplicationDAO.findById = async () => ({
    _id: 'app1',
    status: 'pending',
    userId: { _id: 'u1', email: 'applicant@example.com', fullName: 'Alice' },
  });

  TeacherApplicationDAO.updateStatus = async (id, status, adminId) => {
    statusUpdated = { id, status, adminId };
    return { _id: id, status };
  };

  UserDAO.updateRole = async (userId, role) => {
    roleUpdated = { userId, role };
    return { _id: userId, role };
  };

  NotificationDAO.create = async (data) => {
    notifCreated = data;
    return { _id: 'notif1', ...data };
  };

  EmailUtil.sendApplicationNotification = async (email, status, reason) => {
    emailSent = { email, status, reason };
    return { sent: true };
  };

  try {
    const req = { params: { id: 'app1' }, user: { _id: 'admin1' } };
    const res = createMockRes();
    await AdminController.approveTeacherApplication(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Approve success');

    assert.equal(statusUpdated.status, 'approved');
    assert.equal(roleUpdated.role, 'teacher');
    assert.equal(notifCreated.type, 'teacher approval');
    assert.equal(emailSent.email, 'applicant@example.com');
    assert.equal(emailSent.status, 'approved');
  } finally {
    TeacherApplicationDAO.findById = origFind;
    TeacherApplicationDAO.updateStatus = origUpdateStatus;
    UserDAO.updateRole = origUpdateRole;
    NotificationDAO.create = origCreateNotif;
    EmailUtil.sendApplicationNotification = origSendEmail;
  }
});

test('UC-5.2: rejectTeacherApplication rejects 400 Reason required when empty', async () => {
  const req = { params: { id: 'app1' }, body: { reason: '   ' } };
  const res = createMockRes();
  await AdminController.rejectTeacherApplication(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Reason required');
});

test('UC-5.2: rejectTeacherApplication successfully rejects with reason and sends notification', async () => {
  const origFind = TeacherApplicationDAO.findById;
  const origUpdateStatus = TeacherApplicationDAO.updateStatus;
  const origCreateNotif = NotificationDAO.create;
  const origSendEmail = EmailUtil.sendApplicationNotification;

  let statusUpdated = null;
  let notifCreated = null;
  let emailSent = null;

  TeacherApplicationDAO.findById = async () => ({
    _id: 'app2',
    status: 'pending',
    userId: { _id: 'u2', email: 'bob@example.com' },
  });

  TeacherApplicationDAO.updateStatus = async (id, status, adminId, reason) => {
    statusUpdated = { id, status, adminId, reason };
    return { _id: id, status, rejectReason: reason };
  };

  NotificationDAO.create = async (data) => {
    notifCreated = data;
    return { _id: 'notif2', ...data };
  };

  EmailUtil.sendApplicationNotification = async (email, status, reason) => {
    emailSent = { email, status, reason };
    return { sent: true };
  };

  try {
    const req = {
      params: { id: 'app2' },
      body: { reason: 'Insufficient teaching credentials' },
      user: { _id: 'admin1' },
    };
    const res = createMockRes();
    await AdminController.rejectTeacherApplication(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Reject success');

    assert.equal(statusUpdated.status, 'rejected');
    assert.equal(statusUpdated.reason, 'Insufficient teaching credentials');
    assert.equal(notifCreated.type, 'teacher rejection');
    assert.equal(notifCreated.message, 'Insufficient teaching credentials');
    assert.equal(emailSent.email, 'bob@example.com');
    assert.equal(emailSent.reason, 'Insufficient teaching credentials');
  } finally {
    TeacherApplicationDAO.findById = origFind;
    TeacherApplicationDAO.updateStatus = origUpdateStatus;
    NotificationDAO.create = origCreateNotif;
    EmailUtil.sendApplicationNotification = origSendEmail;
  }
});
