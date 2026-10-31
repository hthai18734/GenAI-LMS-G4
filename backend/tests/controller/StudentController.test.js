const test = require('node:test');
const assert = require('node:assert/strict');
const StudentController = require('../../src/composition/http').controllers.StudentController;
const UserRepository = require('../../src/infrastructure/persistence/mongoose/repositories/identity/UserRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const ProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/ProgressRepository');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const CertificateRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CertificateRepository');
const NotificationPreferenceRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/NotificationPreferenceRepository');

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
  const original = UserRepository.findById;
  const user = mockUser();
  UserRepository.findById = async () => user;
  try {
    const res = await call(StudentController.getProfile, mockReq(user));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.profile.email, 'student@example.com');
    assert.equal(res.body.data.profile.id, '507f1f77bcf86cd799439011');
    // Must not expose password
    assert.equal(res.body.data.profile.passwordHash, undefined);
  } finally {
    UserRepository.findById = original;
  }
});

test('UC-4.1: getProfile returns 404 when profile not found', async () => {
  const original = UserRepository.findById;
  UserRepository.findById = async () => null;
  try {
    const res = await call(StudentController.getProfile, mockReq(mockUser()));
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /not found/i);
  } finally {
    UserRepository.findById = original;
  }
});

// ─── UC-4.2 Update Profile ───────────────────────────────────────

test('UC-4.2: updateProfile with valid data succeeds', async () => {
  const original = UserRepository.updateProfile;
  const user = mockUser();
  UserRepository.updateProfile = async (id, updates) => ({ ...user, ...updates });
  try {
    const req = mockReq(user, { fullName: 'Tran Van B', phone: '0987654321' });
    const res = await call(StudentController.updateProfile, req);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.profile.fullName, 'Tran Van B');
  } finally {
    UserRepository.updateProfile = original;
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
  const original = UserRepository.updateProfile;
  const user = mockUser();
  UserRepository.updateProfile = async (id, updates) => ({ ...user, ...updates });
  try {
    const req = mockReq(user, { avatar: 'data:image/png;base64,iVBORw0KGgo=' });
    const res = await call(StudentController.updateProfile, req);
    assert.equal(res.statusCode, 200);
  } finally {
    UserRepository.updateProfile = original;
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
  const original = UserRepository.updateProfile;
  const user = mockUser();
  UserRepository.updateProfile = async (id, updates) => ({ ...user, ...updates });
  try {
    const req = mockReq(user, { fullName: 'Admin' });
    const res = await call(StudentController.updateProfile, req);
    assert.equal(res.statusCode, 200);
  } finally {
    UserRepository.updateProfile = original;
  }
});

// ─── UC-4.3 View Dashboard ───────────────────────────────────────

test('UC-4.3: getDashboard returns data for authenticated user', async () => {
  const origEnroll = EnrollmentRepository.findByUserId;
  const origProgress = ProgressRepository.findByUserId;
  const origLessonCount = LessonRepository.countByCourseId;
  const origProgressCount = ProgressRepository.countByUserAndCourse;

  EnrollmentRepository.findByUserId = async () => [{
    _id: 'enroll1', status: 'active', enrolledAt: new Date(),
    courseId: { _id: 'course1', title: 'Node.js Basics', thumbnail: null, status: 'PUBLIC' },
  }];
  ProgressRepository.findByUserId = async () => [];
  LessonRepository.countByCourseId = async () => 10;
  ProgressRepository.countByUserAndCourse = async () => 3;

  try {
    const res = await call(StudentController.getDashboard, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.dashboard.enrolledCourses, 1);
    assert.equal(res.body.data.dashboard.activeCourses, 1);
    assert.equal(res.body.data.dashboard.courses[0].progressPercent, 30);
  } finally {
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findByUserId = origProgress;
    LessonRepository.countByCourseId = origLessonCount;
    ProgressRepository.countByUserAndCourse = origProgressCount;
  }
});

test('UC-4.3: getDashboard returns empty when no data', async () => {
  const origEnroll = EnrollmentRepository.findByUserId;
  const origProgress = ProgressRepository.findByUserId;
  EnrollmentRepository.findByUserId = async () => [];
  ProgressRepository.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getDashboard, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.dashboard.enrolledCourses, 0);
    assert.equal(res.body.data.dashboard.courses.length, 0);
  } finally {
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findByUserId = origProgress;
  }
});

// ─── UC-4.4 View Learning History ────────────────────────────────

test('UC-4.4: getLearningHistory returns records for authenticated user', async () => {
  const original = ProgressRepository.findByUserId;
  ProgressRepository.findByUserId = async () => [{
    _id: '507f1f77bcf86cd799439011',
    courseId: { _id: '507f1f77bcf86cd799439012', title: 'Node.js' },
    lessonId: { _id: '507f1f77bcf86cd799439013', title: 'Lesson 1' },
    status: 'completed', completedAt: new Date(), updatedAt: new Date(),
  }];
  try {
    const res = await call(StudentController.getLearningHistory, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.history.length, 1);
    assert.equal(res.body.data.history[0].courseTitle, 'Node.js');
    assert.equal(res.body.data.history[0].id, '507f1f77bcf86cd799439011');
    assert.equal(res.body.data.history[0].courseId, '507f1f77bcf86cd799439012');
    assert.equal(res.body.data.history[0].lessonId, '507f1f77bcf86cd799439013');
  } finally {
    ProgressRepository.findByUserId = original;
  }
});

test('UC-4.4: getLearningHistory returns empty when no records', async () => {
  const original = ProgressRepository.findByUserId;
  ProgressRepository.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getLearningHistory, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.history.length, 0);
  } finally {
    ProgressRepository.findByUserId = original;
  }
});

// ─── UC-4.5 View Certificates ────────────────────────────────────

test('UC-4.5: getCertificates returns valid certificates for completed courses', async () => {
  const original = CertificateRepository.findByUserId;
  CertificateRepository.findByUserId = async () => [{
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
    CertificateRepository.findByUserId = original;
  }
});

test('UC-4.5: getCertificates excludes non-completed enrollment certificates', async () => {
  const original = CertificateRepository.findByUserId;
  CertificateRepository.findByUserId = async () => [{
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
    CertificateRepository.findByUserId = original;
  }
});

test('UC-4.5: getCertificates empty state', async () => {
  const original = CertificateRepository.findByUserId;
  CertificateRepository.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getCertificates, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.certificates.length, 0);
  } finally {
    CertificateRepository.findByUserId = original;
  }
});

// ─── UC-4.6 Notification Preferences ─────────────────────────────

test('UC-4.6: getNotificationPreferences returns defaults when none exist', async () => {
  const original = NotificationPreferenceRepository.findByUserId;
  NotificationPreferenceRepository.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getNotificationPreferences, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.data.preferences.length > 0);
    assert.ok(res.body.data.supportedTypes.length > 0);
  } finally {
    NotificationPreferenceRepository.findByUserId = original;
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
  const original = NotificationPreferenceRepository.upsertMany;
  NotificationPreferenceRepository.upsertMany = async (userId, prefs) =>
    prefs.map((p) => ({ type: p.type, enabled: p.enabled }));
  try {
    const req = mockReq(mockUser(), { preferences: [{ type: 'email', enabled: false }] });
    const res = await call(StudentController.updateNotificationPreferences, req);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /updated/i);
  } finally {
    NotificationPreferenceRepository.upsertMany = original;
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
  const origCourse = CourseRepository.findById;
  const origInc = CourseRepository.incrementStudents;
  const origEnroll = EnrollmentRepository.findActiveEnrollment;
  const origCreate = EnrollmentRepository.createEnrollment;

  CourseRepository.findById = async () => ({ _id: VALID_COURSE_ID, status: 'PUBLIC', title: 'Node.js' });
  CourseRepository.incrementStudents = async () => true;
  EnrollmentRepository.findActiveEnrollment = async () => null;
  EnrollmentRepository.createEnrollment = async (userId, courseId) => ({
    _id: 'enroll1', userId, courseId, status: 'active', enrolledAt: new Date(),
  });

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.enrollCourse, req);
    assert.equal(res.statusCode, 201);
    assert.match(res.body.message, /enrolled/i);
  } finally {
    CourseRepository.findById = origCourse;
    CourseRepository.incrementStudents = origInc;
    EnrollmentRepository.findActiveEnrollment = origEnroll;
    EnrollmentRepository.createEnrollment = origCreate;
  }
});

test('UC-10.1: enrollCourse rejects when course not found', async () => {
  const origCourse = CourseRepository.findById;
  CourseRepository.findById = async () => null;
  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.enrollCourse, req);
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /not found/i);
  } finally {
    CourseRepository.findById = origCourse;
  }
});

test('UC-10.1: enrollCourse rejects when course not open', async () => {
  const origCourse = CourseRepository.findById;
  CourseRepository.findById = async () => ({ _id: VALID_COURSE_ID, status: 'DRAFT', title: 'Node.js' });
  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.enrollCourse, req);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'This course is not open for enrollment.');
  } finally {
    CourseRepository.findById = origCourse;
  }
});

test('UC-10.1: enrollCourse rejects duplicate active enrollment', async () => {
  const origCourse = CourseRepository.findById;
  const origEnroll = EnrollmentRepository.findActiveEnrollment;

  CourseRepository.findById = async () => ({ _id: VALID_COURSE_ID, status: 'PUBLIC', title: 'Node.js' });
  EnrollmentRepository.findActiveEnrollment = async () => ({ _id: 'enroll1', status: 'active' });

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.enrollCourse, req);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, 'You are already enrolled in this course.');
  } finally {
    CourseRepository.findById = origCourse;
    EnrollmentRepository.findActiveEnrollment = origEnroll;
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
  const origCourses = CourseRepository.findAllOpen;
  const origEnroll = EnrollmentRepository.findByUserId;
  const origLessonCount = LessonRepository.countByCourseId;

  CourseRepository.findAllOpen = async () => [{ _id: VALID_COURSE_ID, title: 'Node.js', description: 'Learn Node', thumbnail: null, category: 'Programming', duration: 60, status: 'PUBLIC' }];
  EnrollmentRepository.findByUserId = async () => [];
  LessonRepository.countByCourseId = async () => 10;

  try {
    const req = mockReq(mockUser(), {}, {}, {});
    const res = await call(StudentController.getCatalog, req);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.courses.length, 1);
    assert.equal(res.body.data.courses[0].isEnrolled, false);
  } finally {
    CourseRepository.findAllOpen = origCourses;
    EnrollmentRepository.findByUserId = origEnroll;
    LessonRepository.countByCourseId = origLessonCount;
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
  const origEnroll = EnrollmentRepository.findByUserId;
  const origLessonCount = LessonRepository.countByCourseId;
  const origProgressCount = ProgressRepository.countByUserAndCourse;

  EnrollmentRepository.findByUserId = async () => [{
    _id: 'enroll1', status: 'active', enrolledAt: new Date(), completedAt: null,
    courseId: { _id: 'course1', title: 'Node.js', description: 'Learn Node', thumbnail: null, category: 'Programming', status: 'PUBLIC' },
  }];
  LessonRepository.countByCourseId = async () => 5;
  ProgressRepository.countByUserAndCourse = async () => 2;

  try {
    const res = await call(StudentController.getEnrolledCourses, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.courses.length, 1);
    assert.equal(res.body.data.courses[0].progressPercent, 40);
  } finally {
    EnrollmentRepository.findByUserId = origEnroll;
    LessonRepository.countByCourseId = origLessonCount;
    ProgressRepository.countByUserAndCourse = origProgressCount;
  }
});

test('UC-10.3: getEnrolledCourses returns empty list', async () => {
  const origEnroll = EnrollmentRepository.findByUserId;
  EnrollmentRepository.findByUserId = async () => [];
  try {
    const res = await call(StudentController.getEnrolledCourses, mockReq(mockUser()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.courses.length, 0);
  } finally {
    EnrollmentRepository.findByUserId = origEnroll;
  }
});

// ─── UC-10.4 Start/Resume Course ─────────────────────────────────

test('UC-10.4: startResumeCourse returns current lesson when progress exists', async () => {
  const origEnroll = EnrollmentRepository.findForResume;
  const origProgress = ProgressRepository.findLastAccessedLesson;

  EnrollmentRepository.findForResume = async () => ({
    _id: 'enroll1', status: 'active',
    courseId: { _id: VALID_COURSE_ID, title: 'Node.js' },
  });
  ProgressRepository.findLastAccessedLesson = async () => ({
    lessonId: { _id: VALID_LESSON_ID, title: 'Lesson 3', isPublished: true },
    status: 'in_progress',
  });

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.startResumeCourse, req);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.currentLesson.title, 'Lesson 3');
    assert.equal(res.body.data.currentLesson.status, 'in_progress');
  } finally {
    EnrollmentRepository.findForResume = origEnroll;
    ProgressRepository.findLastAccessedLesson = origProgress;
  }
});

test('UC-10.4: startResumeCourse returns first lesson when no progress', async () => {
  const origEnroll = EnrollmentRepository.findForResume;
  const origProgress = ProgressRepository.findLastAccessedLesson;
  const origFirst = LessonRepository.findFirstLesson;

  EnrollmentRepository.findForResume = async () => ({
    _id: 'enroll1', status: 'active',
    courseId: { _id: VALID_COURSE_ID, title: 'Node.js' },
  });
  ProgressRepository.findLastAccessedLesson = async () => null;
  LessonRepository.findFirstLesson = async () => ({ _id: VALID_LESSON_ID, title: 'Introduction' });

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.startResumeCourse, req);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.currentLesson.title, 'Introduction');
    assert.equal(res.body.data.currentLesson.status, 'not_started');
  } finally {
    EnrollmentRepository.findForResume = origEnroll;
    ProgressRepository.findLastAccessedLesson = origProgress;
    LessonRepository.findFirstLesson = origFirst;
  }
});

test('UC-10.4: startResumeCourse rejects when no active enrollment', async () => {
  const origEnroll = EnrollmentRepository.findForResume;
  EnrollmentRepository.findForResume = async () => null;
  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.startResumeCourse, req);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'No active enrollment was found for this course.');
  } finally {
    EnrollmentRepository.findForResume = origEnroll;
  }
});

test('UC-10.4: startResumeCourse handles missing lessons gracefully', async () => {
  const origEnroll = EnrollmentRepository.findForResume;
  const origProgress = ProgressRepository.findLastAccessedLesson;
  const origFirst = LessonRepository.findFirstLesson;

  EnrollmentRepository.findForResume = async () => ({
    _id: 'enroll1', status: 'active',
    courseId: { _id: VALID_COURSE_ID, title: 'Node.js' },
  });
  ProgressRepository.findLastAccessedLesson = async () => null;
  LessonRepository.findFirstLesson = async () => null;

  try {
    const req = mockReq(mockUser(), {}, { courseId: VALID_COURSE_ID });
    const res = await call(StudentController.startResumeCourse, req);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Unable to restore your previous learning position.');
  } finally {
    EnrollmentRepository.findForResume = origEnroll;
    ProgressRepository.findLastAccessedLesson = origProgress;
    LessonRepository.findFirstLesson = origFirst;
  }
});
