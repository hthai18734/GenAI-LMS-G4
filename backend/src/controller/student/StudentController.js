const UserDAO = require('../../dao/identity/UserDAO');
const CourseDAO = require('../../dao/learning/CourseDAO');
const EnrollmentDAO = require('../../dao/learning/EnrollmentDAO');
const ProgressDAO = require('../../dao/learning/ProgressDAO');
const LessonDAO = require('../../dao/learning/LessonDAO');
const CertificateDAO = require('../../dao/learning/CertificateDAO');
const NotificationPreferenceDAO = require('../../dao/learning/NotificationPreferenceDAO');
const NotificationPreference = require('../../model/learning/NotificationPreference');
const NotificationDAO = require('../../dao/engagement/NotificationDAO');
const Course = require('../../model/learning/Course');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');
const Enrollment = require('../../model/learning/Enrollment');
const ResponseUtil = require('../../utils/common/ResponseUtil');

// DTOs – UC-4.x
const ViewProfileDTO = require('../../dto/student/ViewProfileDTO');
const UpdateProfileDTO = require('../../dto/student/UpdateProfileDTO');
const DashboardQueryDTO = require('../../dto/student/DashboardQueryDTO');
const LearningHistoryQueryDTO = require('../../dto/student/LearningHistoryQueryDTO');
const CertificateQueryDTO = require('../../dto/student/CertificateQueryDTO');
const NotificationPreferencesQueryDTO = require('../../dto/student/NotificationPreferencesQueryDTO');
const UpdateNotificationPreferencesDTO = require('../../dto/student/UpdateNotificationPreferencesDTO');

// DTOs – UC-10.x
const EnrollCourseDTO = require('../../dto/student/EnrollCourseDTO');
const CatalogQueryDTO = require('../../dto/student/CatalogQueryDTO');
const EnrolledCoursesQueryDTO = require('../../dto/student/EnrolledCoursesQueryDTO');
const CourseResumeDTO = require('../../dto/student/CourseResumeDTO');
const CourseLessonsQueryDTO = require('../../dto/student/CourseLessonsQueryDTO');
const CompleteLessonDTO = require('../../dto/student/CompleteLessonDTO');

class StudentController {

  // Validation helper – consistent with TeacherCourseController
  validationError(res, errors) {
    return ResponseUtil.error(res, { status: 400, message: 'Validation failed.', errors });
  }

  // ─── UC-4.1 View Profile ───────────────────────────────────────────
  async getProfile(req, res, next) {
    try {
      const dto = new ViewProfileDTO({ user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId } = dto.toObject();
      const user = await UserDAO.findById(userId);
      if (!user) return ResponseUtil.error(res, { status: 404, message: 'Profile not found.' });
      return ResponseUtil.success(res, { data: { profile: this.toPublicProfile(user) } });
    } catch (error) {
      return next(error);
    }
  }

  // ─── UC-4.2 Update Profile & Upload Avatar ─────────────────────────
  async updateProfile(req, res, next) {
    try {
      const dto = new UpdateProfileDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const updates = dto.toObject();
      const user = await UserDAO.updateProfile(req.user._id, updates);
      if (!user) return ResponseUtil.error(res, { status: 404, message: 'Profile not found.' });
      return ResponseUtil.success(res, { message: 'Profile updated successfully.', data: { profile: this.toPublicProfile(user) } });
    } catch (error) {
      if (error?.code === 11000) {
        return ResponseUtil.error(res, { status: 409, message: 'This email is already in use.' });
      }
      return next(error);
    }
  }

  // ─── UC-4.3 View Dashboard ─────────────────────────────────────────
  async getDashboard(req, res, next) {
    try {
      const dto = new DashboardQueryDTO({ user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId } = dto.toObject();
      const enrollments = await EnrollmentDAO.findByUserId(userId);
      const progressRecords = await ProgressDAO.findByUserId(userId);

      const enrolledCourses = enrollments.length;
      const activeCourses = enrollments.filter((e) => e.status === 'active').length;
      const completedCourses = enrollments.filter((e) => e.status === 'completed').length;

      // Build per-course progress summary
      const courseProgressMap = {};
      for (const enrollment of enrollments) {
        if (!enrollment.courseId) continue;
        const courseId = String(enrollment.courseId._id || enrollment.courseId);
        const course = enrollment.courseId._id ? enrollment.courseId : null;
        const totalLessons = course ? await LessonDAO.countByCourseId(courseId) : 0;
        const completedLessons = await ProgressDAO.countByUserAndCourse(userId, courseId);

        courseProgressMap[courseId] = {
          id: courseId,
          _id: courseId,
          courseId,
          title: course?.title || 'Unknown Course',
          thumbnail: course?.thumbnail || null,
          category: course?.category || null,
          enrollmentStatus: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          totalLessons,
          completedLessons,
          progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        };
      }

      // Recently accessed – last 5 progress entries
      const recentActivity = progressRecords.slice(0, 5).map((p) => ({
        courseId: p.courseId?._id ? String(p.courseId._id) : (p.courseId ? String(p.courseId) : null),
        courseTitle: p.courseId?.title || 'Unknown Course',
        lessonId: p.lessonId?._id ? String(p.lessonId._id) : (p.lessonId ? String(p.lessonId) : null),
        lessonTitle: p.lessonId?.title || 'Unknown Lesson',
        status: p.status,
        updatedAt: p.updatedAt,
      }));

      return ResponseUtil.success(res, {
        data: {
          dashboard: {
            enrolledCourses,
            activeCourses,
            completedCourses,
            courses: Object.values(courseProgressMap),
            recentActivity,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─── UC-4.4 View Learning History ──────────────────────────────────
  async getLearningHistory(req, res, next) {
    try {
      const dto = new LearningHistoryQueryDTO({ user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId } = dto.toObject();
      const records = await ProgressDAO.findByUserId(userId);

      const history = records.map((p) => ({
        courseTitle: p.courseId?.title || 'Unknown Course',
        lessonTitle: p.lessonId?.title || 'Unknown Lesson',
        status: p.status,
        completedAt: p.completedAt,
        updatedAt: p.updatedAt,
      }));

      return ResponseUtil.success(res, { data: { history } });
    } catch (error) {
      return next(error);
    }
  }

  // ─── UC-4.5 View Certificates ──────────────────────────────────────
  async getCertificates(req, res, next) {
    try {
      const dto = new CertificateQueryDTO({ user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId } = dto.toObject();
      const certificates = await CertificateDAO.findByUserId(userId);

      // Only return certificates for completed enrollments
      const validCertificates = certificates
        .filter((cert) => cert.enrollmentId && cert.enrollmentId.status === 'completed')
        .map((cert) => ({
          id: String(cert._id),
          courseTitle: cert.courseId?.title || 'Unknown Course',
          certificateNumber: cert.certificateNumber,
          issuedAt: cert.issuedAt,
        }));

      return ResponseUtil.success(res, { data: { certificates: validCertificates } });
    } catch (error) {
      return next(error);
    }
  }

  // ─── UC-4.6 Manage Notification Preferences ────────────────────────
  async getNotificationPreferences(req, res, next) {
    try {
      const dto = new NotificationPreferencesQueryDTO({ user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId } = dto.toObject();
      const preferences = await NotificationPreferenceDAO.findByUserId(userId);

      // If no preferences exist, return defaults
      if (preferences.length === 0) {
        const defaults = NotificationPreference.NOTIFICATION_TYPES.map((type) => ({
          type,
          enabled: true,
        }));
        return ResponseUtil.success(res, { data: { preferences: defaults, supportedTypes: NotificationPreference.NOTIFICATION_TYPES } });
      }

      const mapped = preferences.map((p) => ({ type: p.type, enabled: p.enabled }));
      return ResponseUtil.success(res, { data: { preferences: mapped, supportedTypes: NotificationPreference.NOTIFICATION_TYPES } });
    } catch (error) {
      return next(error);
    }
  }

  async updateNotificationPreferences(req, res, next) {
    try {
      const dto = new UpdateNotificationPreferencesDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { preferences } = dto.toObject();
      const updated = await NotificationPreferenceDAO.upsertMany(req.user._id, preferences);
      const mapped = updated.map((p) => ({ type: p.type, enabled: p.enabled }));
      return ResponseUtil.success(res, { message: 'Notification preferences updated.', data: { preferences: mapped } });
    } catch (error) {
      return next(error);
    }
  }

  // ─── UC-10.1 Enroll Course ─────────────────────────────────────────
  async enrollCourse(req, res, next) {
    try {
      const dto = new EnrollCourseDTO({ params: req.params, body: req.body });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { courseId } = dto.toObject();
      const userId = req.user._id;

      // Step 1: Course must exist
      const course = await CourseDAO.findById(courseId);
      if (!course) {
        return ResponseUtil.error(res, { status: 404, message: 'Course not found.' });
      }

      // Step 2: Only public courses accept enrollment.
      if (course.status !== COURSE_STATUS.PUBLIC) {
        return ResponseUtil.error(res, { status: 400, message: 'This course is not open for enrollment.' });
      }

      // Step 3: Check duplicate active enrollment
      const existingEnrollment = await EnrollmentDAO.findActiveEnrollment(userId, courseId);
      if (existingEnrollment) {
        return ResponseUtil.error(res, { status: 409, message: 'You are already enrolled in this course.' });
      }

      // Step 4: All checks passed – create enrollment
      const enrollment = await EnrollmentDAO.createEnrollment(userId, courseId);
      await CourseDAO.incrementStudents(courseId);

      // Step 5: Create in-app notification for the student if 'enrollment' preference is enabled
      try {
        const isEnrollmentNotiEnabled = await NotificationPreferenceDAO.isEnabled(userId, 'enrollment');
        if (isEnrollmentNotiEnabled) {
          await NotificationDAO.create({
            recipientId: userId,
            title: 'Xác nhận Đăng ký khóa học',
            message: `Bạn đã ghi danh thành công vào khóa học "${course.title}". Bắt đầu học ngay để đạt mục tiêu!`,
            type: 'course',
          });
        }
      } catch { /* ignore notification errors */ }

      return ResponseUtil.success(res, {
        status: 201,
        message: 'Enrolled successfully.',
        data: {
          enrollment: {
            id: String(enrollment._id),
            courseId: String(enrollment.courseId),
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─── UC-10.3 View Enrolled Courses ─────────────────────────────────
  async getEnrolledCourses(req, res, next) {
    try {
      const dto = new EnrolledCoursesQueryDTO({ user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId } = dto.toObject();
      const enrollments = await EnrollmentDAO.findByUserId(userId);

      const courses = [];
      for (const enrollment of enrollments) {
        const course = enrollment.courseId;
        if (!course || !course._id) continue;

        const totalLessons = await LessonDAO.countByCourseId(course._id);
        const completedLessons = await ProgressDAO.countByUserAndCourse(userId, course._id);

        courses.push({
          id: String(course._id),
          _id: String(course._id),
          courseId: String(course._id),
          enrollmentId: String(enrollment._id),
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          category: course.category,
          enrollmentStatus: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          totalLessons,
          completedLessons,
          progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        });
      }

      return ResponseUtil.success(res, { data: { courses } });
    } catch (error) {
      return next(error);
    }
  }

  // ─── UC-10.4 Start/Resume Course ───────────────────────────────────
  async startResumeCourse(req, res, next) {
    try {
      const dto = new CourseResumeDTO({ params: req.params, user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId, courseId } = dto.toObject();

      // Find active enrollment for this user + course
      const enrollment = await EnrollmentDAO.findForResume(userId, courseId);
      if (!enrollment) {
        return ResponseUtil.error(res, { status: 404, message: 'No active enrollment was found for this course.' });
      }

      // Find saved position (last accessed lesson)
      const lastProgress = await ProgressDAO.findLastAccessedLesson(userId, courseId);

      if (lastProgress && lastProgress.lessonId) {
        return ResponseUtil.success(res, {
          data: {
            courseId: String(enrollment.courseId._id || enrollment.courseId),
            courseTitle: enrollment.courseId.title || 'Course',
            currentLesson: {
              lessonId: String(lastProgress.lessonId._id || lastProgress.lessonId),
              title: lastProgress.lessonId.title || 'Lesson',
              status: lastProgress.status,
            },
            enrollmentStatus: enrollment.status,
          },
        });
      }

      // No progress yet – try to start from first lesson
      const firstLesson = await LessonDAO.findFirstLesson(courseId);
      if (!firstLesson) {
        return ResponseUtil.error(res, { status: 404, message: 'Unable to restore your previous learning position.' });
      }

      return ResponseUtil.success(res, {
        data: {
          courseId: String(enrollment.courseId._id || enrollment.courseId),
          courseTitle: enrollment.courseId.title || 'Course',
          currentLesson: {
            lessonId: String(firstLesson._id),
            title: firstLesson.title,
            status: 'not_started',
          },
          enrollmentStatus: enrollment.status,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─── Course Catalog (UC-10.1 helper) ──────────────────────────────
  async getCatalog(req, res, next) {
    try {
      const dto = new CatalogQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const courses = await CourseDAO.findAllOpen();
      const userId = req.user._id;
      const enrollments = await EnrollmentDAO.findByUserId(userId);
      const enrolledSet = new Set(enrollments.map((e) => String(e.courseId?._id || e.courseId)));

      const catalog = [];
      for (const course of courses) {
        const totalLessons = await LessonDAO.countByCourseId(course._id);
        catalog.push({
          id: String(course._id),
          _id: String(course._id),
          courseId: String(course._id),
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          category: course.category,
          level: course.level || 'all',
          price: course.price || 0,
          duration: course.duration,
          durationHours: course.duration ? Math.round(course.duration / 60) || 1 : 1,
          totalStudents: course.totalStudents || 0,
          status: course.status,
          totalLessons,
          isEnrolled: enrolledSet.has(String(course._id)),
        });
      }

      return ResponseUtil.success(res, { data: { courses: catalog } });
    } catch (error) {
      return next(error);
    }
  }

  // ─── Course Lessons (UC-10.4 study lesson) ─────────────────────────
  async getCourseLessons(req, res, next) {
    try {
      const dto = new CourseLessonsQueryDTO({ params: req.params, user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId, courseId } = dto.toObject();

      const enrollment = await Enrollment.findOne({
        userId,
        courseId,
        status: { $in: ['active', 'completed'] },
      }).exec();

      if (!enrollment) {
        return ResponseUtil.error(res, { status: 403, message: 'You must be enrolled to view lessons.' });
      }

      const course = await CourseDAO.findById(courseId);
      const lessons = await LessonDAO.findByCourseId(courseId);
      const progressList = await ProgressDAO.findByUserAndCourse(userId, courseId);
      const progressMap = {};
      progressList.forEach((p) => {
        if (p.lessonId?._id) progressMap[String(p.lessonId._id)] = p.status;
      });

      return ResponseUtil.success(res, {
        data: {
          course: {
            id: String(course._id),
            _id: String(course._id),
            courseId: String(course._id),
            title: course.title,
            description: course.description,
            thumbnail: course.thumbnail,
            category: course.category,
          },
          enrollmentStatus: enrollment.status,
          lessons: lessons.map((l) => ({
            id: String(l._id),
            _id: String(l._id),
            title: l.title,
            content: l.content,
            order: l.order,
            duration: l.duration,
            status: progressMap[String(l._id)] || 'not_started',
          })),
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─── Complete Lesson (Progress tracking) ───────────────────────────
  async completeLesson(req, res, next) {
    try {
      const dto = new CompleteLessonDTO({ params: req.params, user: req.user });
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);

      const { userId, courseId, lessonId } = dto.toObject();

      const enrollment = await Enrollment.findOne({
        userId,
        courseId,
        status: { $in: ['active', 'completed'] },
      }).exec();

      if (!enrollment) {
        return ResponseUtil.error(res, { status: 403, message: 'You must be enrolled in this course.' });
      }

      await ProgressDAO.upsertProgress(userId, courseId, lessonId, 'completed');

      const totalLessons = await LessonDAO.countByCourseId(courseId);
      const completedLessons = await ProgressDAO.countByUserAndCourse(userId, courseId);

      let isCompleted = false;
      let certificate = null;

      if (totalLessons > 0 && completedLessons >= totalLessons) {
        isCompleted = true;
        await EnrollmentDAO.markCompleted(enrollment._id);
        certificate = await CertificateDAO.issueCertificate(userId, courseId, enrollment._id);

        // Notification: Course completed + Certificate issued
        try {
          const isCourseUpdateEnabled = await NotificationPreferenceDAO.isEnabled(userId, 'course_update');
          if (isCourseUpdateEnabled) {
            const courseDoc = await CourseDAO.findById(courseId);
            await NotificationDAO.create({
              recipientId: userId,
              title: '🎉 Hoàn thành khóa học xuất sắc!',
              message: `Chúc mừng! Bạn đã hoàn thành khóa học "${courseDoc?.title || 'Course'}". Chứng chỉ số ${certificate?.certificateNumber || ''} đã được cấp!`,
              type: 'course',
            });
          }
        } catch { /* ignore */ }
      } else {
        // Notification: Lesson completed progress
        try {
          const isCourseUpdateEnabled = await NotificationPreferenceDAO.isEnabled(userId, 'course_update');
          if (isCourseUpdateEnabled) {
            await NotificationDAO.create({
              recipientId: userId,
              title: 'Bài học hoàn thành!',
              message: `Tiến độ học tập: ${completedLessons}/${totalLessons} bài học đã hoàn thành. Hãy tiếp tục nỗ lực!`,
              type: 'course',
            });
          }
        } catch { /* ignore */ }
      }

      return ResponseUtil.success(res, {
        message: 'Lesson marked as completed.',
        data: {
          completedLessons,
          totalLessons,
          isCompleted,
          certificateNumber: certificate?.certificateNumber || null,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─── Notifications ─────────────────────────────────────────────────
  async getNotifications(req, res, next) {
    try {
      const userId = req.user._id;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const notifications = await NotificationDAO.findByRecipient(userId, { limit });
      return ResponseUtil.success(res, {
        data: {
          notifications: notifications.map((n) => ({
            id: String(n._id),
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.isRead,
            createdAt: n.createdAt,
          })),
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user._id;
      const Notification = require('../../model/engagement/Notification');
      const count = await Notification.countDocuments({ recipientId: userId, isRead: false });
      return ResponseUtil.success(res, { data: { unreadCount: count } });
    } catch (error) {
      return next(error);
    }
  }

  async markNotificationRead(req, res, next) {
    try {
      const { notificationId } = req.params;
      const mongoose = require('mongoose');
      if (!mongoose.isValidObjectId(notificationId)) {
        return ResponseUtil.error(res, { status: 400, message: 'Invalid notification ID.' });
      }
      const updated = await NotificationDAO.markAsRead(notificationId);
      if (!updated) {
        return ResponseUtil.error(res, { status: 404, message: 'Notification not found.' });
      }
      return ResponseUtil.success(res, { message: 'Notification marked as read.' });
    } catch (error) {
      return next(error);
    }
  }

  async markAllNotificationsRead(req, res, next) {
    try {
      const userId = req.user._id;
      const Notification = require('../../model/engagement/Notification');
      await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
      return ResponseUtil.success(res, { message: 'All notifications marked as read.' });
    } catch (error) {
      return next(error);
    }
  }

  async sendTestNotification(req, res, next) {
    try {
      const userId = req.user._id;
      const { type = 'system' } = req.body || {};

      // Check if this type is enabled in user's preferences
      const isEnabled = await NotificationPreferenceDAO.isEnabled(userId, type);
      if (!isEnabled) {
        return ResponseUtil.error(res, {
          status: 400,
          message: `Loại thông báo này hiện đang TẮT trong cài đặt của bạn. Hãy bật lên trước khi thử!`,
        });
      }

      const sampleMessages = {
        course_update: {
          title: 'Cập nhật bài giảng mới',
          message: 'Khóa học của bạn vừa có tài liệu và video bổ sung mới.',
          type: 'course',
        },
        email: {
          title: 'Bản tin học tập qua Email',
          message: 'Tóm tắt tuần: Bạn đã hoàn thành các mục tiêu học tập xuất sắc!',
          type: 'general',
        },
        enrollment: {
          title: 'Xác nhận Đăng ký khóa học',
          message: 'Ghi danh khóa học thành công! Chúc bạn có trải nghiệm học tập tốt.',
          type: 'course',
        },
        promotion: {
          title: 'Khóa học công nghệ miễn phí',
          message: 'Sự kiện chia sẻ AI & ưu đãi học viên mới đã mở đăng ký!',
          type: 'general',
        },
        system: {
          title: 'Thông báo Hệ thống & Bảo mật',
          message: 'Hệ thống AI-LMS hoạt động ổn định và bảo mật phiên đăng nhập của bạn.',
          type: 'system',
        },
      };

      const payload = sampleMessages[type] || sampleMessages.system;
      const created = await NotificationDAO.create({
        recipientId: userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
      });

      return ResponseUtil.success(res, {
        status: 201,
        message: 'Đã gửi thông báo thử nghiệm thành công! Hãy kiểm tra chuông thông báo trên Topbar.',
        data: {
          notification: {
            id: String(created._id),
            title: created.title,
            message: created.message,
            type: created.type,
            createdAt: created.createdAt,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────
  toPublicProfile(user) {
    return {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

module.exports = new StudentController();
