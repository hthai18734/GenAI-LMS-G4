module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { studentService: StudentService } = UseCases;
const { notificationService: NotificationService } = UseCases;
const { handleError } = require('../common/ControllerUtil');
const ViewProfileDTO = require('../../dto/student/ViewProfileDTO');
const UpdateProfileDTO = require('../../dto/student/UpdateProfileDTO');
const DashboardQueryDTO = require('../../dto/student/DashboardQueryDTO');
const LearningHistoryQueryDTO = require('../../dto/student/LearningHistoryQueryDTO');
const CertificateQueryDTO = require('../../dto/student/CertificateQueryDTO');
const NotificationPreferencesQueryDTO = require('../../dto/student/NotificationPreferencesQueryDTO');
const UpdateNotificationPreferencesDTO = require('../../dto/student/UpdateNotificationPreferencesDTO');
const EnrollCourseDTO = require('../../dto/student/EnrollCourseDTO');
const CatalogQueryDTO = require('../../dto/student/CatalogQueryDTO');
const EnrolledCoursesQueryDTO = require('../../dto/student/EnrolledCoursesQueryDTO');
const CourseResumeDTO = require('../../dto/student/CourseResumeDTO');
const CourseLessonsQueryDTO = require('../../dto/student/CourseLessonsQueryDTO');
const CompleteLessonDTO = require('../../dto/student/CompleteLessonDTO');

class StudentController {
  validationError(res, errors) { return ResponseUtil.error(res, { status: 400, message: 'Validation failed.', errors }); }
  parse(res, Dto, input) {
    const dto = new Dto(input); const errors = dto.validate();
    if (Object.keys(errors).length) { this.validationError(res, errors); return null; }
    return dto.toObject();
  }
  async respond(res, next, action, options = {}) {
    try { return ResponseUtil.success(res, { ...options, data: await action() }); }
    catch (error) { return handleError(res, next, error); }
  }
  async getProfile(req, res, next) {
    const input = this.parse(res, ViewProfileDTO, { user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.getProfile(input.userId));
  }
  async updateProfile(req, res, next) {
    const input = this.parse(res, UpdateProfileDTO, req.body); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.updateProfile(req.user._id, input), { message: 'Profile updated successfully.' });
  }
  async getDashboard(req, res, next) {
    const input = this.parse(res, DashboardQueryDTO, { user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.getDashboard(input.userId));
  }
  async getLearningHistory(req, res, next) {
    const input = this.parse(res, LearningHistoryQueryDTO, { user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.getLearningHistory(input.userId));
  }
  async getCertificates(req, res, next) {
    const input = this.parse(res, CertificateQueryDTO, { user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.getCertificates(input.userId));
  }
  async getNotificationPreferences(req, res, next) {
    const input = this.parse(res, NotificationPreferencesQueryDTO, { user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.getNotificationPreferences(input.userId));
  }
  async updateNotificationPreferences(req, res, next) {
    const input = this.parse(res, UpdateNotificationPreferencesDTO, req.body); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.updateNotificationPreferences(req.user._id, input.preferences), { message: 'Notification preferences updated.' });
  }
  async enrollCourse(req, res, next) {
    const input = this.parse(res, EnrollCourseDTO, { params: req.params, body: req.body }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.enroll(req.user._id, input.courseId), { status: 201, message: 'Enrolled successfully.' });
  }
  async getEnrollmentStatus(req, res, next) { return this.respond(res, next, () => StudentService.getEnrollmentStatus(req.user._id, req.params.courseId)); }
  async getEnrolledCourses(req, res, next) {
    const input = this.parse(res, EnrolledCoursesQueryDTO, { user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.getEnrolledCourses(input.userId));
  }
  async startResumeCourse(req, res, next) {
    const input = this.parse(res, CourseResumeDTO, { params: req.params, user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.resume(req.user, input.courseId));
  }
  async getCatalog(req, res, next) {
    const input = this.parse(res, CatalogQueryDTO, req.query); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.getCatalog(req.user._id));
  }
  async getCourseLessons(req, res, next) {
    const input = this.parse(res, CourseLessonsQueryDTO, { params: req.params, user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.getCourseLessons(req.user, input.courseId));
  }
  async completeLesson(req, res, next) {
    const input = this.parse(res, CompleteLessonDTO, { params: req.params, user: req.user }); if (!input) return undefined;
    return this.respond(res, next, () => StudentService.completeLesson(input.userId, input.courseId, input.lessonId), { message: 'Lesson marked as completed.' });
  }
  async getTeacherApplicationStatus(req, res, next) { return this.respond(res, next, () => StudentService.getTeacherApplication(req.user._id)); }
  async applyTeacher(req, res, next) { return this.respond(res, next, () => StudentService.applyTeacher(req.user, req.body || {}), { status: 201, message: 'Teacher application submitted successfully! Please wait for administrator approval.' }); }
  async getNotifications(req, res, next) { return this.respond(res, next, () => StudentService.listNotifications(req.user._id, req.query.limit)); }
  async getUnreadCount(req, res, next) { return this.respond(res, next, () => NotificationService.unreadCount(req.user._id)); }
  async markNotificationRead(req, res, next) {
    return this.respond(res, next, async () => { await NotificationService.markAsRead(req.params.notificationId, req.user._id); return null; }, { message: 'Notification marked as read.' });
  }
  async markAllNotificationsRead(req, res, next) {
    return this.respond(res, next, async () => { await NotificationService.markAllAsRead(req.user._id); return null; }, { message: 'All notifications marked as read.' });
  }
  async sendTestNotification(req, res, next) { return this.respond(res, next, () => StudentService.sendTestNotification(req.user._id, req.body?.type), { status: 201, message: 'Test notification sent! Check the notification bell in the top bar.' }); }
  toPublicProfile(user) { return StudentService.toPublicProfile(user); }
}
return  new StudentController();
};
