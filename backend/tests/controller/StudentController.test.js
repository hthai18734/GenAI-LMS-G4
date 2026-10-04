const test = require('node:test');
const assert = require('node:assert/strict');
const StudentController = require('../../src/controller/student/StudentController');
const UserDAO = require('../../src/dao/identity/UserDAO');
const CourseDAO = require('../../src/dao/learning/CourseDAO');
const EnrollmentDAO = require('../../src/dao/learning/EnrollmentDAO');
const ProgressDAO = require('../../src/dao/learning/ProgressDAO');
const LessonDAO = require('../../src/dao/learning/LessonDAO');
const CertificateDAO = require('../../src/dao/learning/CertificateDAO');
const NotificationPreferenceDAO = require('../../src/dao/learning/NotificationPreferenceDAO');

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function mockUser(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    fullName: 'Nguyen Van A',
    email: 'student@example.com',
    phone: '0912345678',
    role: 'student',
    avatar: null,
    status: 'active',
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockReq(user, body = {}, params = {}, query = {}) {
  return { user, body, params, query };
}

async function call(method, req) {
  const res = response();
  let nextError;
  await method.call(StudentController, req, res, (err) => { nextError = err; });
  if (nextError) throw nextError;
  return res;
}

// Valid MongoDB ObjectId for tests
const VALID_COURSE_ID = '507f1f77bcf86cd799439012';
const VALID_LESSON_ID = '507f1f77bcf86cd799439013';

// ─── UC-4.1 View Profile ─────────────────────────────────────────

test('UC-4.1: getProfile returns profile for authenticated user', async () => {
  const original = UserDAO.findById;
  const user = mockUser();
  UserDAO.findById = async () => user;
  try {
    const res = await call(StudentController.getProfile, mockReq(user));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.profile.email, 'student@example.com');
    assert.equal(res.body.data.profile.id, '507f1f77bcf86cd799439011');
    // Must not expose password
    assert.equal(res.body.data.profile.passwordHash, undefined);
  } finally {
    UserDAO.findById = original;
  }
});

test('UC-4.1: getProfile returns 404 when profile not found', async () => {
  const original = UserDAO.findById;
  UserDAO.findById = async () => null;
  try {
    const res = await call(StudentController.getProfile, mockReq(mockUser()));
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /not found/i);
  } finally {
    UserDAO.findById = original;
  }
});

// ─── UC-4.2 Update Profile ───────────────────────────────────────

test('UC-4.2: updateProfile with valid data succeeds', async () => {
  const original = UserDAO.updateProfile;
  const user = mockUser();
  UserDAO.updateProfile = async (id, updates) => ({ ...user, ...updates });
  try {
    const req = mockReq(user, { fullName: 'Tran Van B', phone: '0987654321' });
    const res = await call(StudentController.updateProfile, req);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.profile.fullName, 'Tran Van B');
  } finally {
    UserDAO.updateProfile = original;
  }
});

test('UC-4.2: updateProfile rejects empty full name', async () => {
  const user = mockUser();
  const req = mockReq(user, { fullName: '   ' });
  const res = await call(StudentController.updateProfile, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
  assert.ok(res.body.errors.fullName);
  assert.match(res.body.errors.fullName, /required/i);
});

test('UC-4.2: updateProfile rejects invalid phone format', async () => {
  const user = mockUser();
  const req = mockReq(user, { phone: '12345' });
  const res = await call(StudentController.updateProfile, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
  assert.ok(res.body.errors.phone);
  assert.match(res.body.errors.phone, /phone/i);
});

test('UC-4.2: updateProfile rejects invalid avatar type', async () => {
  const user = mockUser();
  const req = mockReq(user, { avatar: 'data:image/gif;base64,R0lGODlh' });
  const res = await call(StudentController.updateProfile, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
  assert.ok(res.body.errors.avatar);
  assert.match(res.body.errors.avatar, /JPEG|PNG|WebP/i);
});

test('UC-4.2: updateProfile accepts valid avatar', async () => {
  const original = UserDAO.updateProfile;
  const user = mockUser();
  UserDAO.updateProfile = async (id, updates) => ({ ...user, ...updates });
  try {
    const req = mockReq(user, { avatar: 'data:image/png;base64,iVBORw0KGgo=' });
    const res = await call(StudentController.updateProfile, req);
    assert.equal(res.statusCode, 200);
  } finally {
    UserDAO.updateProfile = original;
  }
});

test('UC-4.2: updateProfile rejects unsupported fields', async () => {
  const user = mockUser();
  const req = mockReq(user, { fullName: 'Nguyen Van B', unknownField: 'test' });
  const res = await call(StudentController.updateProfile, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
  assert.ok(res.body.errors.payload);
});

test('UC-4.2: updateProfile rejects empty body', async () => {
  const user = mockUser();
  const req = mockReq(user, {});
  const res = await call(StudentController.updateProfile, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
});

test('UC-4.2: updateProfile accepts flexible name formats', async () => {
  const original = UserDAO.updateProfile;
  const user = mockUser();
  UserDAO.updateProfile = async (id, updates) => ({ ...user, ...updates });
  try {
    const req = mockReq(user, { fullName: 'Admin' });
    const res = await call(StudentController.updateProfile, req);
    assert.equal(res.statusCode, 200);
  } finally {
    UserDAO.updateProfile = original;
  }
});

// ─── UC-4.3 View Dashboard ───────────────────────────────────────

test('UC-4.3: getDashboard returns data for authenticated user', async () => {
  const origEnroll = EnrollmentDAO.findByUserId;
  const origProgress = ProgressDAO.findByUserId;
  const origLessonCount = LessonDAO.countByCourseId;
  const origProgressCount = ProgressDAO.countByUserAndCourse;

  EnrollmentDAO.findByUserId = async () => [{
    _id: 'enroll1', status: 'active', enrolledAt: new Date(),
    courseId: { _id: 'course1', title: 'Node.js Basics', thumbnail: null },
  }];
  ProgressDAO.findByUserId = async () => [];
  LessonDAO.countByCourseId = async () => 10;
  ProgressDAO.countByUserAndCourse = async () => 3;

  try {
    const res = await call(StudentController.getDashboard, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.dashboard.enrolledCourses, 1);
    assert.equal(res.body.data.dashboard.activeCourses, 1);
    assert.equal(res.body.data.dashboard.courses[0].progressPercent, 30);
  } finally {
    EnrollmentDAO.findByUserId = origEnroll;
    ProgressDAO.findByUserId = origProgress;
    LessonDAO.countByCourseId = origLessonCount;
    ProgressDAO.countByUserAndCourse = origProgressCount;
  }
});

test('UC-4.3: getDashboard returns empty when no data', async () => {
  const origEnroll = EnrollmentDAO.findByUserId;
  const origProgress = ProgressDAO.findByUserId;
  EnrollmentDAO.findByUserId = async () => [];
  ProgressDAO.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getDashboard, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.dashboard.enrolledCourses, 0);
    assert.equal(res.body.data.dashboard.courses.length, 0);
  } finally {
    EnrollmentDAO.findByUserId = origEnroll;
    ProgressDAO.findByUserId = origProgress;
  }
});

// ─── UC-4.4 View Learning History ────────────────────────────────

test('UC-4.4: getLearningHistory returns records for authenticated user', async () => {
  const original = ProgressDAO.findByUserId;
  ProgressDAO.findByUserId = async () => [{
    courseId: { title: 'Node.js' }, lessonId: { title: 'Lesson 1' },
    status: 'completed', completedAt: new Date(), updatedAt: new Date(),
  }];
  try {
    const res = await call(StudentController.getLearningHistory, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.history.length, 1);
    assert.equal(res.body.data.history[0].courseTitle, 'Node.js');
  } finally {
    ProgressDAO.findByUserId = original;
  }
});

test('UC-4.4: getLearningHistory returns empty when no records', async () => {
  const original = ProgressDAO.findByUserId;
  ProgressDAO.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getLearningHistory, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.history.length, 0);
  } finally {
    ProgressDAO.findByUserId = original;
  }
});

// ─── UC-4.5 View Certificates ────────────────────────────────────

test('UC-4.5: getCertificates returns valid certificates for completed courses', async () => {
  const original = CertificateDAO.findByUserId;
  CertificateDAO.findByUserId = async () => [{
    _id: 'cert1',
    courseId: { title: 'Node.js' },
    enrollmentId: { status: 'completed' },
    certificateNumber: 'CERT-001',
    issuedAt: new Date(),
  }];
  try {
    const res = await call(StudentController.getCertificates, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.certificates.length, 1);
    assert.equal(res.body.data.certificates[0].certificateNumber, 'CERT-001');
  } finally {
    CertificateDAO.findByUserId = original;
  }
});

test('UC-4.5: getCertificates excludes non-completed enrollment certificates', async () => {
  const original = CertificateDAO.findByUserId;
  CertificateDAO.findByUserId = async () => [{
    _id: 'cert1',
    courseId: { title: 'Node.js' },
    enrollmentId: { status: 'active' }, // Not completed
    certificateNumber: 'CERT-001',
    issuedAt: new Date(),
  }];
  try {
    const res = await call(StudentController.getCertificates, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.certificates.length, 0);
  } finally {
    CertificateDAO.findByUserId = original;
  }
});

test('UC-4.5: getCertificates empty state', async () => {
  const original = CertificateDAO.findByUserId;
  CertificateDAO.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getCertificates, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.certificates.length, 0);
  } finally {
    CertificateDAO.findByUserId = original;
  }
});

// ─── UC-4.6 Notification Preferences ─────────────────────────────

test('UC-4.6: getNotificationPreferences returns defaults when none exist', async () => {
  const original = NotificationPreferenceDAO.findByUserId;
  NotificationPreferenceDAO.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getNotificationPreferences, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.data.preferences.length > 0);
    assert.ok(res.body.data.supportedTypes.length > 0);
  } finally {
    NotificationPreferenceDAO.findByUserId = original;
  }
});

test('UC-4.6: updateNotificationPreferences rejects unsupported type', async () => {
  const req = mockReq(mockUser(), { preferences: [{ type: 'invalid_type', enabled: true }] });
  const res = await call(StudentController.updateNotificationPreferences, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
  assert.ok(Object.keys(res.body.errors).some((k) => k.includes('preferences')));
});

test('UC-4.6: updateNotificationPreferences succeeds with valid types', async () => {
  const original = NotificationPreferenceDAO.upsertMany;
  NotificationPreferenceDAO.upsertMany = async (userId, prefs) =>
    prefs.map((p) => ({ type: p.type, enabled: p.enabled }));
  try {
    const req = mockReq(mockUser(), { preferences: [{ type: 'email', enabled: false }] });
    const res = await call(StudentController.updateNotificationPreferences, req);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /updated/i);
  } finally {
    NotificationPreferenceDAO.upsertMany = original;
  }
});

test('UC-4.6: updateNotificationPreferences rejects empty array', async () => {
  const req = mockReq(mockUser(), { preferences: [] });
  const res = await call(StudentController.updateNotificationPreferences, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
});

test('UC-4.6: updateNotificationPreferences rejects non-boolean enabled', async () => {
  const req = mockReq(mockUser(), { preferences: [{ type: 'email', enabled: 'yes' }] });
  const res = await call(StudentController.updateNotificationPreferences, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
});

test('UC-4.6: updateNotificationPreferences rejects unsupported fields', async () => {
  const req = mockReq(mockUser(), { preferences: [{ type: 'email', enabled: true }], extraField: true });
  const res = await call(StudentController.updateNotificationPreferences, req);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.errors.payload);
});

// ─── UC-10.1 Enroll Course ───────────────────────────────────────

test('UC-10.1: enrollCourse succeeds when all checks pass', async () => {
  const origCourse = CourseDAO.findById;
  const origInc = CourseDAO.incrementStudents;
  const origEnroll = EnrollmentDAO.findActiveEnrollment;
  const origCreate = EnrollmentDAO.createEnrollment;

  CourseDAO.findById = async () => ({ _id: VALID_COURSE_ID, status: 'PUBLIC', title: 'Node.js' });
  CourseDAO.incrementStudents = async () => true;
  EnrollmentDAO.findActiveEnrollment = async () => null;
  EnrollmentDAO.createEnrollment = async (userId, courseId) => ({
    _id: 'enroll1', userId, courseId, status: 'active', enrolledAt: new Date(),
  });

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.enrollCourse, req);
    assert.equal(res.statusCode, 201);
    assert.match(res.body.message, /enrolled/i);
  } finally {
    CourseDAO.findById = origCourse;
    CourseDAO.incrementStudents = origInc;
    EnrollmentDAO.findActiveEnrollment = origEnroll;
    EnrollmentDAO.createEnrollment = origCreate;
  }
});

test('UC-10.1: enrollCourse rejects when course not found', async () => {
  const origCourse = CourseDAO.findById;
  CourseDAO.findById = async () => null;
  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.enrollCourse, req);
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /not found/i);
  } finally {
    CourseDAO.findById = origCourse;
  }
});

test('UC-10.1: enrollCourse rejects when course not open', async () => {
  const origCourse = CourseDAO.findById;
  CourseDAO.findById = async () => ({ _id: VALID_COURSE_ID, status: 'DRAFT', title: 'Node.js' });
  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.enrollCourse, req);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'This course is not open for enrollment.');
  } finally {
    CourseDAO.findById = origCourse;
  }
});

test('UC-10.1: enrollCourse rejects duplicate active enrollment', async () => {
  const origCourse = CourseDAO.findById;
  const origEnroll = EnrollmentDAO.findActiveEnrollment;

  CourseDAO.findById = async () => ({ _id: VALID_COURSE_ID, status: 'PUBLIC', title: 'Node.js' });
  EnrollmentDAO.findActiveEnrollment = async () => ({ _id: 'enroll1', status: 'active' });

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.enrollCourse, req);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, 'You are already enrolled in this course.');
  } finally {
    CourseDAO.findById = origCourse;
    EnrollmentDAO.findActiveEnrollment = origEnroll;
  }
});

test('UC-10.1: enrollCourse rejects missing courseId', async () => {
  const req = mockReq(mockUser(), {}, {});
  const res = await call(StudentController.enrollCourse, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
  assert.ok(res.body.errors.courseId);
  assert.match(res.body.errors.courseId, /course id/i);
});

test('UC-10.1: enrollCourse rejects invalid courseId format', async () => {
  const req = mockReq(mockUser(), {}, { courseId: 'not-an-objectid' });
  const res = await call(StudentController.enrollCourse, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
  assert.ok(res.body.errors.courseId);
});

// ─── UC-10.1 Catalog ─────────────────────────────────────────────

test('UC-10.1: getCatalog returns courses with enrollment status', async () => {
  const origCourses = CourseDAO.findAllOpen;
  const origEnroll = EnrollmentDAO.findByUserId;
  const origLessonCount = LessonDAO.countByCourseId;

  CourseDAO.findAllOpen = async () => [{ _id: VALID_COURSE_ID, title: 'Node.js', description: 'Learn Node', thumbnail: null, category: 'Programming', duration: 60, status: 'PUBLIC' }];
  EnrollmentDAO.findByUserId = async () => [];
  LessonDAO.countByCourseId = async () => 10;

  try {
    const req = mockReq(mockUser(), {}, {}, {});
    const res = await call(StudentController.getCatalog, req);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.courses.length, 1);
    assert.equal(res.body.data.courses[0].isEnrolled, false);
  } finally {
    CourseDAO.findAllOpen = origCourses;
    EnrollmentDAO.findByUserId = origEnroll;
    LessonDAO.countByCourseId = origLessonCount;
  }
});

test('UC-10.1: getCatalog rejects invalid page param', async () => {
  const req = mockReq(mockUser(), {}, {}, { page: '-1' });
  const res = await call(StudentController.getCatalog, req);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Validation failed.');
  assert.ok(res.body.errors.page);
});

// ─── UC-10.3 View Enrolled Courses ───────────────────────────────

test('UC-10.3: getEnrolledCourses returns courses with progress', async () => {
  const origEnroll = EnrollmentDAO.findByUserId;
  const origLessonCount = LessonDAO.countByCourseId;
  const origProgressCount = ProgressDAO.countByUserAndCourse;

  EnrollmentDAO.findByUserId = async () => [{
    _id: 'enroll1', status: 'active', enrolledAt: new Date(), completedAt: null,
    courseId: { _id: 'course1', title: 'Node.js', description: 'Learn Node', thumbnail: null, category: 'Programming' },
  }];
  LessonDAO.countByCourseId = async () => 5;
  ProgressDAO.countByUserAndCourse = async () => 2;

  try {
    const res = await call(StudentController.getEnrolledCourses, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.courses.length, 1);
    assert.equal(res.body.data.courses[0].progressPercent, 40);
  } finally {
    EnrollmentDAO.findByUserId = origEnroll;
    LessonDAO.countByCourseId = origLessonCount;
    ProgressDAO.countByUserAndCourse = origProgressCount;
  }
});

test('UC-10.3: getEnrolledCourses returns empty list', async () => {
  const origEnroll = EnrollmentDAO.findByUserId;
  EnrollmentDAO.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getEnrolledCourses, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.courses.length, 0);
  } finally {
    EnrollmentDAO.findByUserId = origEnroll;
  }
});

// ─── UC-10.4 Start/Resume Course ─────────────────────────────────

test('UC-10.4: startResumeCourse returns current lesson when progress exists', async () => {
  const origEnroll = EnrollmentDAO.findForResume;
  const origProgress = ProgressDAO.findLastAccessedLesson;

  EnrollmentDAO.findForResume = async () => ({
    _id: 'enroll1', status: 'active',
    courseId: { _id: VALID_COURSE_ID, title: 'Node.js' },
  });
  ProgressDAO.findLastAccessedLesson = async () => ({
    lessonId: { _id: VALID_LESSON_ID, title: 'Lesson 3' },
    status: 'in_progress',
  });

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.startResumeCourse, req);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.currentLesson.title, 'Lesson 3');
    assert.equal(res.body.data.currentLesson.status, 'in_progress');
  } finally {
    EnrollmentDAO.findForResume = origEnroll;
    ProgressDAO.findLastAccessedLesson = origProgress;
  }
});

test('UC-10.4: startResumeCourse returns first lesson when no progress', async () => {
  const origEnroll = EnrollmentDAO.findForResume;
  const origProgress = ProgressDAO.findLastAccessedLesson;
  const origFirst = LessonDAO.findFirstLesson;

  EnrollmentDAO.findForResume = async () => ({
    _id: 'enroll1', status: 'active',
    courseId: { _id: VALID_COURSE_ID, title: 'Node.js' },
  });
  ProgressDAO.findLastAccessedLesson = async () => null;
  LessonDAO.findFirstLesson = async () => ({ _id: VALID_LESSON_ID, title: 'Introduction' });

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.startResumeCourse, req);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.currentLesson.title, 'Introduction');
    assert.equal(res.body.data.currentLesson.status, 'not_started');
  } finally {
    EnrollmentDAO.findForResume = origEnroll;
    ProgressDAO.findLastAccessedLesson = origProgress;
    LessonDAO.findFirstLesson = origFirst;
  }
});

test('UC-10.4: startResumeCourse rejects when no active enrollment', async () => {
  const origEnroll = EnrollmentDAO.findForResume;
  EnrollmentDAO.findForResume = async () => null;
  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.startResumeCourse, req);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'No active enrollment was found for this course.');
  } finally {
    EnrollmentDAO.findForResume = origEnroll;
  }
});

test('UC-10.4: startResumeCourse handles missing lessons gracefully', async () => {
  const origEnroll = EnrollmentDAO.findForResume;
  const origProgress = ProgressDAO.findLastAccessedLesson;
  const origFirst = LessonDAO.findFirstLesson;

  EnrollmentDAO.findForResume = async () => ({
    _id: 'enroll1', status: 'active',
    courseId: { _id: VALID_COURSE_ID, title: 'Node.js' },
  });
  ProgressDAO.findLastAccessedLesson = async () => null;
  LessonDAO.findFirstLesson = async () => null;

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.startResumeCourse, req);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Unable to restore your previous learning position.');
  } finally {
    EnrollmentDAO.findForResume = origEnroll;
    ProgressDAO.findLastAccessedLesson = origProgress;
    LessonDAO.findFirstLesson = origFirst;
  }
});
