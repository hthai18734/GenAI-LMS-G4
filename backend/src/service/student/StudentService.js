const { NOTIFICATION_TYPES } = require('../../domain/learning/NotificationPolicy');
const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

function publicProfile(user) {
  return { id: String(user._id), fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, teachingStatus: user.teachingStatus || 'active', avatar: user.avatar, status: user.status, emailVerifiedAt: user.emailVerifiedAt, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt, updatedAt: user.updatedAt };
}
function enrollmentView(enrollment) {
  return { id: String(enrollment._id), courseId: String(enrollment.courseId), status: enrollment.status, enrolledAt: enrollment.enrolledAt };
}

class StudentService {
  constructor({ userRepository, courseRepository, enrollmentRepository, progressRepository, lessonRepository, certificateRepository, videoProgressRepository, notificationPreferenceRepository, notificationRepository, teacherApplicationRepository } = {}) {
    this.userRepository = userRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.progressRepository = progressRepository;
    this.lessonRepository = lessonRepository;
    this.certificateRepository = certificateRepository;
    this.videoProgressRepository = videoProgressRepository;
    this.notificationPreferenceRepository = notificationPreferenceRepository;
    this.notificationRepository = notificationRepository;
    this.teacherApplicationRepository = teacherApplicationRepository;
  }
  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new ServiceError(404, 'Profile not found.');
    return { profile: publicProfile(user) };
  }
  async updateProfile(userId, updates) {
    try {
      const user = await this.userRepository.updateProfile(userId, updates);
      if (!user) throw new ServiceError(404, 'Profile not found.');
      return { profile: publicProfile(user) };
    } catch (error) {
      if (error.code === 11000) throw new ServiceError(409, 'This email is already in use.');
      throw error;
    }
  }
  async getDashboard(userId) {
    const [allEnrollments, progressRecords] = await Promise.all([this.enrollmentRepository.findByUserId(userId), this.progressRepository.findByUserId(userId)]);
    const enrollments = allEnrollments.filter((e) => e.courseId && !e.courseId.deletedAt);
    const courses = [];
    for (const enrollment of enrollments) {
      const course = enrollment.courseId?._id ? enrollment.courseId : null;
      if (!course || course.deletedAt) continue;
      const courseId = String(course._id);
      const [totalLessons, completedLessons] = await Promise.all([this.lessonRepository.countByCourseId(courseId), this.progressRepository.countByUserAndCourse(userId, courseId)]);
      courses.push({ id: courseId, _id: courseId, courseId, title: course.title || 'Unknown Course', thumbnail: course.thumbnail || null, category: course.category || null, enrollmentStatus: enrollment.status, enrolledAt: enrollment.enrolledAt, totalLessons, completedLessons, progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0 });
    }
    const recentActivity = progressRecords.filter((p) => p.courseId && !p.courseId.deletedAt).slice(0, 5).map((p) => ({ courseId: p.courseId?._id ? String(p.courseId._id) : String(p.courseId), courseTitle: p.courseId?.title || 'Unknown Course', lessonId: p.lessonId?._id ? String(p.lessonId._id) : (p.lessonId ? String(p.lessonId) : null), lessonTitle: p.lessonId?.title || 'Unknown Lesson', status: p.status, updatedAt: p.updatedAt }));
    return { dashboard: { enrolledCourses: enrollments.length, activeCourses: enrollments.filter((e) => e.status === 'active').length, completedCourses: enrollments.filter((e) => e.status === 'completed').length, courses, recentActivity } };
  }
  async getLearningHistory(userId) {
    const records = await this.progressRepository.findByUserId(userId);
    return { history: records.filter((p) => p.courseId && !p.courseId.deletedAt).map((p) => ({ courseTitle: p.courseId?.title || 'Unknown Course', lessonTitle: p.lessonId?.title || 'Unknown Lesson', status: p.status, completedAt: p.completedAt, updatedAt: p.updatedAt })) };
  }
  async getCertificates(userId) {
    const certificates = await this.certificateRepository.findByUserId(userId);
    return { certificates: certificates.filter((c) => c.courseId && !c.courseId.deletedAt && c.enrollmentId?.status === 'completed').map((c) => ({ id: String(c._id), courseTitle: c.courseId?.title || 'Unknown Course', certificateNumber: c.certificateNumber, issuedAt: c.issuedAt })) };
  }
  async getNotificationPreferences(userId) {
    const preferences = await this.notificationPreferenceRepository.findByUserId(userId);
    const values = new Map((preferences || []).map((p) => [p.type, p.enabled]));
    return { preferences: NOTIFICATION_TYPES.map((type) => ({ type, enabled: values.has(type) ? Boolean(values.get(type)) : true })), supportedTypes: NOTIFICATION_TYPES };
  }
  async updateNotificationPreferences(userId, preferences) {
    return { preferences: (await this.notificationPreferenceRepository.upsertMany(userId, preferences)).map((p) => ({ type: p.type, enabled: p.enabled })) };
  }
  async enroll(userId, courseId) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new ServiceError(404, 'Course not found.');
    if (![COURSE_STATUS.PUBLIC, COURSE_STATUS.APPROVED].includes(course.status)) throw new ServiceError(400, 'This course is not open for enrollment.');
    if (await this.enrollmentRepository.findActiveEnrollment(userId, courseId)) throw new ServiceError(409, 'You are already enrolled in this course.');
    const enrollment = await this.enrollmentRepository.createEnrollment(userId, courseId);
    await this.courseRepository.incrementStudents(courseId);
    try {
      if (await this.notificationPreferenceRepository.isEnabled(userId, 'enrollment')) await this.notificationRepository.create({ recipientId: userId, title: 'Enrollment Confirmation', message: `You have successfully enrolled in "${course.title}". Start learning to reach your goals!`, type: 'course' });
    } catch { /* notification failure must not roll back enrollment */ }
    return { enrollment: enrollmentView(enrollment) };
  }
  async getEnrollmentStatus(userId, courseId) {
    const enrollment = await this.enrollmentRepository.findActiveEnrollment(userId, courseId);
    return { isEnrolled: Boolean(enrollment), enrollment: enrollment ? enrollmentView(enrollment) : null };
  }
  async getEnrolledCourses(userId) {
    const enrollments = await this.enrollmentRepository.findByUserId(userId); const seen = new Set(); const courses = [];
    for (const enrollment of enrollments) {
      const course = enrollment.courseId;
      if (!course?._id || course.deletedAt || seen.has(String(course._id))) continue;
      seen.add(String(course._id));
      const [totalLessons, completedLessons] = await Promise.all([this.lessonRepository.countByCourseId(course._id), this.progressRepository.countByUserAndCourse(userId, course._id)]);
      courses.push({ id: String(course._id), _id: String(course._id), courseId: String(course._id), enrollmentId: String(enrollment._id), title: course.title, description: course.description, thumbnail: course.thumbnail, category: course.category, enrollmentStatus: enrollment.status, enrolledAt: enrollment.enrolledAt, completedAt: enrollment.completedAt, totalLessons, completedLessons, progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0 });
    }
    return { courses };
  }
  async resume(user, courseId) {
    const userId = user._id; const enrollment = await this.enrollmentRepository.findForResume(userId, courseId); let course = null;
    if (!enrollment) {
      if (user.role === 'student') throw new ServiceError(404, 'No active enrollment was found for this course.');
      course = await this.courseRepository.findById(courseId);
      if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');
      if (user.role !== 'admin' && String(course.teacherId) !== String(userId) && String(course.instructorId) !== String(userId)) throw new ServiceError(404, 'No active enrollment was found for this course.');
    }
    const courseDoc = enrollment?.courseId || course; const last = await this.progressRepository.findLastAccessedLesson(userId, courseId);
    const currentLesson = last?.lessonId ? { lessonId: String(last.lessonId._id || last.lessonId), title: last.lessonId.title || 'Lesson', status: last.status } : await this.firstLesson(courseId);
    return { courseId: String(courseDoc?._id || courseId), courseTitle: courseDoc?.title || 'Course', currentLesson, enrollmentStatus: enrollment?.status || 'active' };
  }
  async firstLesson(courseId) {
    const lesson = await this.lessonRepository.findFirstLesson(courseId);
    if (!lesson) throw new ServiceError(404, 'Unable to restore your previous learning position.');
    return { lessonId: String(lesson._id), title: lesson.title, status: 'not_started' };
  }
  async getCatalog(userId) {
    const [available, enrollments] = await Promise.all([this.courseRepository.findAllOpen(), this.enrollmentRepository.findByUserId(userId)]);
    const enrolled = new Set(enrollments.map((e) => String(e.courseId?._id || e.courseId))); const courses = [];
    for (const course of available) courses.push({ id: String(course._id), _id: String(course._id), courseId: String(course._id), title: course.title, description: course.description, thumbnail: course.thumbnail, category: course.category, level: course.level || 'all', price: course.price || 0, duration: course.duration, durationHours: course.duration ? Math.round(course.duration / 60) || 1 : 1, totalStudents: course.totalStudents || 0, status: course.status, totalLessons: await this.lessonRepository.countByCourseId(course._id), isEnrolled: enrolled.has(String(course._id)) });
    return { courses };
  }
  async getCourseLessons(user, courseId) {
    const userId = user._id; const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');
    const elevated = user.role === 'admin' || String(course.teacherId) === String(userId) || String(course.instructorId) === String(userId);
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(userId, courseId);
    if (!enrollment && !elevated) throw new ServiceError(403, 'You must be enrolled to view lessons.');
    const [lessons, progressList] = await Promise.all([elevated ? this.lessonRepository.findByCourseId(courseId) : this.lessonRepository.findPublishedByCourseId(courseId), this.progressRepository.findByUserAndCourse(userId, courseId)]);
    const progress = new Map(progressList.filter((p) => p.lessonId?._id).map((p) => [String(p.lessonId._id), p.status]));
    return { enrollmentId: enrollment ? String(enrollment._id) : null, course: { id: String(course._id), _id: String(course._id), courseId: String(course._id), title: course.title, description: course.description, thumbnail: course.thumbnail, category: course.category }, enrollmentStatus: enrollment?.status || 'active', lessons: lessons.map((l) => ({ id: String(l._id), _id: String(l._id), title: l.title, content: l.content, order: l.order, duration: l.duration, videoRef: l.videoRef || null, status: progress.get(String(l._id)) || 'not_started' })) };
  }
  async completeLesson(userId, courseId, lessonId) {
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(userId, courseId);
    if (!enrollment) throw new ServiceError(403, 'You must be enrolled in this course.');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (lesson?.videoRef) {
      const video = await this.videoProgressRepository.findByStudentAndVideo(userId, lessonId); const watched = video?.watchedPercent || 0;
      if (!video?.completed && watched < 90) throw new ServiceError(400, `You must watch at least 90% of the video duration before completing this lesson (Current: ${Math.round(watched)}%).`);
    }
    await this.progressRepository.upsertProgress(userId, courseId, lessonId, 'completed');
    const [totalLessons, completedLessons] = await Promise.all([this.lessonRepository.countByCourseId(courseId), this.progressRepository.countByUserAndCourse(userId, courseId)]);
    const isCompleted = totalLessons > 0 && completedLessons >= totalLessons; let certificate = null;
    if (isCompleted) { await this.enrollmentRepository.markCompleted(enrollment._id); certificate = await this.certificateRepository.issueCertificate(userId, courseId, enrollment._id); }
    await this.notifyProgress(userId, courseId, completedLessons, totalLessons, certificate).catch(() => {});
    return { completedLessons, totalLessons, isCompleted, certificateNumber: certificate?.certificateNumber || null };
  }
  async notifyProgress(userId, courseId, completed, total, certificate) {
    if (!await this.notificationPreferenceRepository.isEnabled(userId, 'course_update')) return;
    const course = certificate ? await this.courseRepository.findById(courseId) : null;
    await this.notificationRepository.create({ recipientId: userId, title: certificate ? 'Course Completed!' : 'Lesson Completed!', message: certificate ? `Congratulations! You have completed "${course?.title || 'Course'}". Certificate ${certificate.certificateNumber || ''} has been issued!` : `Learning progress: ${completed}/${total} lessons completed. Keep up the good work!`, type: 'course' });
  }
  async getTeacherApplication(userId) { return { application: await this.teacherApplicationRepository.findLatestByUser(userId) }; }
  async applyTeacher(user, body) {
    const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
    if (bio.length < 10) throw new ServiceError(400, 'Please describe yourself and your professional experience (at least 10 characters).');
    if (user.role === 'teacher') throw new ServiceError(400, 'Your account already has the teacher role.');
    if (await this.teacherApplicationRepository.findPendingByUser(user._id)) throw new ServiceError(400, 'You already have an application awaiting administrator review.');
    const certificates = Array.isArray(body.certificates) ? body.certificates : (typeof body.certificates === 'string' ? body.certificates.split(',').map((c) => c.trim()).filter(Boolean) : []);
    return { application: await this.teacherApplicationRepository.create({ userId: user._id, bio, cvUrl: body.cvUrl ? body.cvUrl.trim() : null, certificates, status: 'pending' }) };
  }
  async listNotifications(userId, limit) {
    const notifications = await this.notificationRepository.findByRecipient(userId, { limit: Math.min(parseInt(limit) || 20, 50) });
    return { notifications: notifications.map((n) => ({ id: String(n._id), title: n.title, message: n.message, type: n.type, isRead: n.isRead, createdAt: n.createdAt })) };
  }
  async sendTestNotification(userId, type = 'system') {
    if (!await this.notificationPreferenceRepository.isEnabled(userId, type)) throw new ServiceError(400, 'This notification type is disabled in your settings. Enable it before sending a test!');
    const samples = { course_update: ['New Lesson Update', 'New resources and videos are available for your course.', 'course'], email: ['Learning Email Digest', 'Weekly summary: You have reached your learning goals. Great work!', 'general'], enrollment: ['Enrollment Confirmation', 'Enrolled successfully! Enjoy your learning experience.', 'course'], system: ['System & Security Notification', 'AI-LMS is running normally and your sign-in session is secure.', 'system'] };
    const [title, message, notificationType] = samples[type] || samples.system;
    const created = await this.notificationRepository.create({ recipientId: userId, title, message, type: notificationType });
    return { notification: { id: String(created._id), title: created.title, message: created.message, type: created.type, createdAt: created.createdAt } };
  }
  toPublicProfile(user) { return publicProfile(user); }
}
module.exports = StudentService;
