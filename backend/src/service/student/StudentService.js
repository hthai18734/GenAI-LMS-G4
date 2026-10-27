// Compatibility facade for the existing HTTP controller. Each responsibility
// is implemented by an independently testable application service and wired in
// the composition root.
class StudentService {
  constructor({ profileService, learningService, notificationService, teacherApplicationService } = {}) {
    this.profileService = profileService;
    this.learningService = learningService;
    this.notificationService = notificationService;
    this.teacherApplicationService = teacherApplicationService;
  }

  getProfile(...args) { return this.profileService.getProfile(...args); }
  updateProfile(...args) { return this.profileService.updateProfile(...args); }
  toPublicProfile(...args) { return this.profileService.toPublicProfile(...args); }

  getDashboard(...args) { return this.learningService.getDashboard(...args); }
  getLearningHistory(...args) { return this.learningService.getLearningHistory(...args); }
  getCertificates(...args) { return this.learningService.getCertificates(...args); }
  enroll(...args) { return this.learningService.enroll(...args); }
  getEnrollmentStatus(...args) { return this.learningService.getEnrollmentStatus(...args); }
  getEnrolledCourses(...args) { return this.learningService.getEnrolledCourses(...args); }
  resume(...args) { return this.learningService.resume(...args); }
  firstLesson(...args) { return this.learningService.firstLesson(...args); }
  getCatalog(...args) { return this.learningService.getCatalog(...args); }
  getCourseLessons(...args) { return this.learningService.getCourseLessons(...args); }
  completeLesson(...args) { return this.learningService.completeLesson(...args); }

  getNotificationPreferences(...args) { return this.notificationService.getNotificationPreferences(...args); }
  updateNotificationPreferences(...args) { return this.notificationService.updateNotificationPreferences(...args); }
  listNotifications(...args) { return this.notificationService.listNotifications(...args); }
  sendTestNotification(...args) { return this.notificationService.sendTestNotification(...args); }

  getTeacherApplication(...args) { return this.teacherApplicationService.getTeacherApplication(...args); }
  applyTeacher(...args) { return this.teacherApplicationService.applyTeacher(...args); }
}

module.exports = StudentService;
