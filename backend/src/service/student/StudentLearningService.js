const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

function enrollmentView(enrollment) {
  return {
    id: String(enrollment._id),
    courseId: String(enrollment.courseId),
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
  };
}

class StudentLearningService {
  constructor({
    courseRepository, enrollmentRepository, progressRepository, lessonRepository,
    certificateRepository, videoProgressRepository, notificationPreferenceRepository,
    notificationRepository, learningActivityLogRepository,
  } = {}) {
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.progressRepository = progressRepository;
    this.lessonRepository = lessonRepository;
    this.certificateRepository = certificateRepository;
    this.videoProgressRepository = videoProgressRepository;
    this.notificationPreferenceRepository = notificationPreferenceRepository;
    this.notificationRepository = notificationRepository;
    this.learningActivityLogRepository = learningActivityLogRepository;
  }

  async getDashboard(userId) {
    const [allEnrollments, progressRecords] = await Promise.all([
      this.enrollmentRepository.findByUserId(userId),
      this.progressRepository.findByUserId(userId),
    ]);
    const enrollments = allEnrollments.filter((enrollment) => (
      enrollment.courseId?.status === COURSE_STATUS.PUBLIC && !enrollment.courseId.deletedAt
    ));
    const courses = [];
    for (const enrollment of enrollments) {
      const course = enrollment.courseId?._id ? enrollment.courseId : null;
      if (!course || course.deletedAt) continue;
      const courseId = String(course._id);
      const [totalLessons, completedLessons] = await Promise.all([
        this.lessonRepository.countByCourseId(courseId, { publishedOnly: true }),
        this.progressRepository.countByUserAndCourse(userId, courseId, { publishedOnly: true }),
      ]);
      courses.push({
        id: courseId, _id: courseId, courseId, title: course.title || 'Unknown Course',
        thumbnail: course.thumbnail || null, category: course.category || null,
        enrollmentStatus: enrollment.status, enrolledAt: enrollment.enrolledAt,
        totalLessons, completedLessons,
        progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      });
    }
    const recentActivity = progressRecords
      .filter((progress) => progress.courseId?.status === COURSE_STATUS.PUBLIC && !progress.courseId.deletedAt)
      .slice(0, 5)
      .map((progress) => ({
        courseId: progress.courseId?._id ? String(progress.courseId._id) : String(progress.courseId),
        courseTitle: progress.courseId?.title || 'Unknown Course',
        lessonId: progress.lessonId?._id ? String(progress.lessonId._id) : (progress.lessonId ? String(progress.lessonId) : null),
        lessonTitle: progress.lessonId?.title || 'Unknown Lesson',
        status: progress.status,
        updatedAt: progress.updatedAt,
      }));
    return {
      dashboard: {
        enrolledCourses: enrollments.length,
        activeCourses: enrollments.filter((enrollment) => enrollment.status === 'active').length,
        completedCourses: enrollments.filter((enrollment) => enrollment.status === 'completed').length,
        courses,
        recentActivity,
      },
    };
  }

  async getLearningHistory(userId) {
    const records = await this.progressRepository.findByUserId(userId);
    return {
      history: records.filter((progress) => progress.courseId && !progress.courseId.deletedAt).map((progress) => ({
        courseTitle: progress.courseId?.title || 'Unknown Course',
        lessonTitle: progress.lessonId?.title || 'Unknown Lesson',
        status: progress.status,
        completedAt: progress.completedAt,
        updatedAt: progress.updatedAt,
      })),
    };
  }

  async getCertificates(userId) {
    const certificates = await this.certificateRepository.findByUserId(userId);
    return {
      certificates: certificates
        .filter((certificate) => certificate.courseId && !certificate.courseId.deletedAt && certificate.enrollmentId?.status === 'completed')
        .map((certificate) => ({
          id: String(certificate._id),
          courseTitle: certificate.courseId?.title || 'Unknown Course',
          certificateNumber: certificate.certificateNumber,
          issuedAt: certificate.issuedAt,
        })),
    };
  }

  async enroll(userId, courseId) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new ServiceError(404, 'Course not found.');
    if (course.status !== COURSE_STATUS.PUBLIC || course.deletedAt) throw new ServiceError(400, 'This course is not open for enrollment.');
    if (await this.enrollmentRepository.findActiveEnrollment(userId, courseId)) throw new ServiceError(409, 'You are already enrolled in this course.');
    const enrollment = await this.enrollmentRepository.createEnrollment(userId, courseId);
    await this.courseRepository.incrementStudents(courseId);
    try {
      if (await this.notificationPreferenceRepository.isEnabled(userId, 'enrollment')) {
        await this.notificationRepository.create({
          recipientId: userId,
          title: 'Enrollment Confirmation',
          message: `You have successfully enrolled in "${course.title}". Start learning to reach your goals!`,
          type: 'course',
        });
      }
    } catch { /* notification failure must not roll back enrollment */ }
    return { enrollment: enrollmentView(enrollment) };
  }

  async getEnrollmentStatus(userId, courseId) {
    const enrollment = await this.enrollmentRepository.findActiveEnrollment(userId, courseId);
    return { isEnrolled: Boolean(enrollment), enrollment: enrollment ? enrollmentView(enrollment) : null };
  }

  async getEnrolledCourses(userId) {
    const enrollments = await this.enrollmentRepository.findByUserId(userId);
    const seen = new Set();
    const courses = [];
    for (const enrollment of enrollments) {
      const course = enrollment.courseId;
      if (!course?._id || course.deletedAt || course.status !== COURSE_STATUS.PUBLIC || seen.has(String(course._id))) continue;
      seen.add(String(course._id));
      const [totalLessons, completedLessons] = await Promise.all([
        this.lessonRepository.countByCourseId(course._id, { publishedOnly: true }),
        this.progressRepository.countByUserAndCourse(userId, course._id, { publishedOnly: true }),
      ]);
      courses.push({
        id: String(course._id), _id: String(course._id), courseId: String(course._id),
        enrollmentId: String(enrollment._id), title: course.title, description: course.description,
        thumbnail: course.thumbnail, category: course.category, enrollmentStatus: enrollment.status,
        enrolledAt: enrollment.enrolledAt, completedAt: enrollment.completedAt,
        totalLessons, completedLessons,
        progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      });
    }
    return { courses };
  }

  async resume(user, courseId) {
    const userId = user._id;
    const enrollment = await this.enrollmentRepository.findForResume(userId, courseId);
    let course = null;
    if (!enrollment) {
      if (user.role === 'student') throw new ServiceError(404, 'No active enrollment was found for this course.');
      course = await this.courseRepository.findById(courseId);
      if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');
      const ownsCourse = String(course.teacherId) === String(userId) || String(course.instructorId) === String(userId);
      if (user.role !== 'admin' && !ownsCourse) throw new ServiceError(404, 'No active enrollment was found for this course.');
    }
    const courseRecord = enrollment?.courseId || course;
    const last = await this.progressRepository.findLastAccessedLesson(userId, courseId);
    const currentLesson = last?.lessonId?.isPublished === true
      ? { lessonId: String(last.lessonId._id), title: last.lessonId.title || 'Lesson', status: last.status }
      : await this.firstLesson(courseId);
    return {
      courseId: String(courseRecord?._id || courseId),
      courseTitle: courseRecord?.title || 'Course',
      currentLesson,
      enrollmentStatus: enrollment?.status || 'active',
    };
  }

  async firstLesson(courseId) {
    const lesson = await this.lessonRepository.findFirstLesson(courseId, { publishedOnly: true });
    if (!lesson) throw new ServiceError(404, 'Unable to restore your previous learning position.');
    return { lessonId: String(lesson._id), title: lesson.title, status: 'not_started' };
  }

  async getCatalog(userId) {
    const [available, enrollments] = await Promise.all([
      this.courseRepository.findAllOpen(),
      this.enrollmentRepository.findByUserId(userId),
    ]);
    const enrolled = new Set(enrollments.map((enrollment) => String(enrollment.courseId?._id || enrollment.courseId)));
    const courses = [];
    for (const course of available) {
      courses.push({
        id: String(course._id), _id: String(course._id), courseId: String(course._id),
        title: course.title, description: course.description, thumbnail: course.thumbnail,
        category: course.category, level: course.level || 'all', price: course.price || 0,
        duration: course.duration, durationHours: course.duration ? Math.round(course.duration / 60) || 1 : 1,
        totalStudents: course.totalStudents || 0, status: course.status,
        totalLessons: await this.lessonRepository.countByCourseId(course._id, { publishedOnly: true }),
        isEnrolled: enrolled.has(String(course._id)),
      });
    }
    return { courses };
  }

  async getCourseLessons(user, courseId) {
    const userId = user._id;
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');
    const elevated = user.role === 'admin'
      || String(course.teacherId) === String(userId)
      || String(course.instructorId) === String(userId);
    if (!elevated && course.status !== COURSE_STATUS.PUBLIC) throw new ServiceError(404, 'Course not found.');
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(userId, courseId);
    if (!enrollment && !elevated) throw new ServiceError(403, 'You must be enrolled to view lessons.');
    const [lessons, progressList] = await Promise.all([
      elevated ? this.lessonRepository.findByCourseId(courseId) : this.lessonRepository.findPublishedByCourseId(courseId),
      this.progressRepository.findByUserAndCourse(userId, courseId),
    ]);
    const progress = new Map(progressList
      .filter((record) => record.lessonId?._id)
      .map((record) => [String(record.lessonId._id), record.status]));
    return {
      enrollmentId: enrollment ? String(enrollment._id) : null,
      course: {
        id: String(course._id), _id: String(course._id), courseId: String(course._id),
        title: course.title, description: course.description, thumbnail: course.thumbnail, category: course.category,
      },
      enrollmentStatus: enrollment?.status || 'active',
      lessons: lessons.map((lesson) => ({
        id: String(lesson._id), _id: String(lesson._id), title: lesson.title,
        content: lesson.content, order: lesson.order, duration: lesson.duration,
        videoRef: lesson.videoRef || null, status: progress.get(String(lesson._id)) || 'not_started',
      })),
    };
  }

  async completeLesson(userId, courseId, lessonId) {
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(userId, courseId);
    if (!enrollment) throw new ServiceError(403, 'You must be enrolled in this course.');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || String(lesson.courseId) !== String(courseId) || !lesson.isPublished) {
      throw new ServiceError(404, 'Lesson not found or unavailable.');
    }
    if (lesson.videoRef) {
      const video = await this.videoProgressRepository.findByStudentAndVideo(userId, lessonId);
      const watched = video?.watchedPercent || 0;
      if (!video?.completed && watched < 90) {
        throw new ServiceError(400, `You must watch at least 90% of the video duration before completing this lesson (Current: ${Math.round(watched)}%).`);
      }
    }
    await this.progressRepository.upsertProgress(userId, courseId, lessonId, 'completed');
    const completedAt = new Date();
    await this.learningActivityLogRepository.recordActivityOnce(`lesson-complete:${userId}:${lessonId}`, {
      studentId: userId,
      courseId,
      lessonId,
      activityType: 'LESSON_ACTIVE',
      startedAt: completedAt,
      endedAt: completedAt,
      activeSeconds: 0,
      date: completedAt.toISOString().split('T')[0],
    });
    const [totalLessons, completedLessons] = await Promise.all([
      this.lessonRepository.countByCourseId(courseId, { publishedOnly: true }),
      this.progressRepository.countByUserAndCourse(userId, courseId, { publishedOnly: true }),
    ]);
    const isCompleted = totalLessons > 0 && completedLessons >= totalLessons;
    let certificate = null;
    if (isCompleted) {
      await this.enrollmentRepository.markCompleted(enrollment._id);
      certificate = await this.certificateRepository.issueCertificate(userId, courseId, enrollment._id);
    }
    await this.notifyProgress(userId, courseId, completedLessons, totalLessons, certificate).catch(() => {});
    return {
      completedLessons, totalLessons, isCompleted,
      certificateNumber: certificate?.certificateNumber || null,
    };
  }

  async notifyProgress(userId, courseId, completed, total, certificate) {
    if (!await this.notificationPreferenceRepository.isEnabled(userId, 'course_update')) return;
    const course = certificate ? await this.courseRepository.findById(courseId) : null;
    await this.notificationRepository.create({
      recipientId: userId,
      title: certificate ? 'Course Completed!' : 'Lesson Completed!',
      message: certificate
        ? `Congratulations! You have completed "${course?.title || 'Course'}". Certificate ${certificate.certificateNumber || ''} has been issued!`
        : `Learning progress: ${completed}/${total} lessons completed. Keep up the good work!`,
      type: 'course',
    });
  }
}

module.exports = StudentLearningService;
