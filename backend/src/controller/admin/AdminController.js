/**
 * Author: ThaiQH - CE181542
 * Created at: 01/10/2026
 * Description: Admin Controller - Teacher Application & Dashboard Stats (UC-5.1, UC-5.2)
 */

const TeacherApplicationDAO = require('../../dao/governance/TeacherApplicationDAO');
const UserDAO = require('../../dao/identity/UserDAO');
const NotificationDAO = require('../../dao/engagement/NotificationDAO');
const EmailUtil = require('../../utils/email/EmailUtil');
const ResponseUtil = require('../../utils/common/ResponseUtil');
const User = require('../../model/identity/User');
const Course = require('../../model/learning/Course');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');
const Category = require('../../model/learning/Category');
const TeacherApplication = require('../../model/governance/TeacherApplication');

const TeacherApplicationQueryDTO = require('../../dto/admin/TeacherApplicationQueryDTO');
const ApproveTeacherApplicationDTO = require('../../dto/admin/ApproveTeacherApplicationDTO');
const RejectTeacherApplicationDTO = require('../../dto/admin/RejectTeacherApplicationDTO');

class AdminController {
  /**
   * Helper: Standardize validation errors response with first message priority
   */
  validationError(res, errors, defaultMessage = 'Validation failed.') {
    const firstErrorMessage = Object.values(errors)[0] || defaultMessage;
    return ResponseUtil.error(res, { status: 400, message: firstErrorMessage, errors });
  }

  /**
   * View all or pending teacher applications
   */
  async getTeacherApplications(req, res, next) {
    try {
      const dto = new TeacherApplicationQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const { status } = dto.toObject();
      const applications = await TeacherApplicationDAO.findAll({ status });

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Teacher applications retrieved successfully.',
        data: { applications },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * UC-5.1: Approve Teacher Application
   * Admin views profile -> approve -> change role to Teacher -> send notification & email
   */
  async approveTeacherApplication(req, res, next) {
    try {
      const dto = new ApproveTeacherApplicationDTO(req.params, req.user);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const { applicationId, adminId } = dto.toObject();

      const application = await TeacherApplicationDAO.findById(applicationId);
      if (!application) {
        return ResponseUtil.error(res, { status: 404, message: 'Teacher application not found.' });
      }

      if (application.status !== 'pending') {
        return ResponseUtil.error(res, {
          status: 400,
          message: `Application is already ${application.status}. Only pending applications can be approved.`,
        });
      }

      const applicantUserId = application.userId?._id || application.userId;
      const applicantEmail = application.userId?.email;

      // 1. Update application status to approved
      const updatedApplication = await TeacherApplicationDAO.updateStatus(applicationId, 'approved', adminId);

      // 2. Change role in User record to 'teacher'
      await UserDAO.updateRole(applicantUserId, 'teacher');

      // 3. Create in-app notification
      await NotificationDAO.create({
        recipientId: applicantUserId,
        title: 'Teacher Application Approved',
        message: 'Congratulations! Your application to teach on AI-LMS has been approved.',
        type: 'teacher approval',
      });

      // 4. Send email notification (if email is known)
      if (applicantEmail) {
        await EmailUtil.sendApplicationNotification(applicantEmail, 'approved', null);
      }

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Approve success',
        data: { application: updatedApplication },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * UC-5.2: Reject Teacher Application
   * Admin views profile -> reject -> provide reason -> send notification & email
   */
  async rejectTeacherApplication(req, res, next) {
    try {
      const dto = new RejectTeacherApplicationDTO(req.params, req.body, req.user);
      const errors = dto.validate();
      if (Object.keys(errors).length) {
        return this.validationError(res, errors);
      }

      const { applicationId, reason, adminId } = dto.toObject();

      const application = await TeacherApplicationDAO.findById(applicationId);
      if (!application) {
        return ResponseUtil.error(res, { status: 404, message: 'Teacher application not found.' });
      }

      if (application.status !== 'pending') {
        return ResponseUtil.error(res, {
          status: 400,
          message: `Application is already ${application.status}. Only pending applications can be rejected.`,
        });
      }

      const applicantUserId = application.userId?._id || application.userId;
      const applicantEmail = application.userId?.email;

      // 1. Update application status to rejected with reason
      const updatedApplication = await TeacherApplicationDAO.updateStatus(
        applicationId,
        'rejected',
        adminId,
        reason
      );

      // 2. Create in-app notification
      await NotificationDAO.create({
        recipientId: applicantUserId,
        title: 'Teacher Application Not Approved',
        message: reason,
        type: 'teacher rejection',
      });

      // 3. Send email notification
      if (applicantEmail) {
        await EmailUtil.sendApplicationNotification(applicantEmail, 'rejected', reason);
      }

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Reject success',
        data: { application: updatedApplication },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Helper: Validate rejection reason (kept for backwards compatibility)
   */
  validateRejectReason(reason) {
    const dto = new RejectTeacherApplicationDTO({ id: 'dummy' }, { reason });
    const errors = dto.validate();
    return errors.reason || null;
  }

  /**
   * UC-Admin: Dashboard Statistics & Overview
   */
  async getDashboardStats(req, res, next) {
    try {
      const [
        totalUsers,
        totalStudents,
        totalTeachers,
        totalAdmins,
        pendingApps,
        approvedApps,
        rejectedApps,
        courseAgg,
        totalCategories,
        recentApplications,
        recentPendingCourses,
        recentUsers
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'teacher' }),
        User.countDocuments({ role: 'admin' }),
        TeacherApplication.countDocuments({ status: 'pending' }),
        TeacherApplication.countDocuments({ status: 'approved' }),
        TeacherApplication.countDocuments({ status: 'rejected' }),
        Course.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Category.countDocuments({ deletedAt: null }),
        TeacherApplication.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('userId', 'fullName email avatar role status'),
        Course.find({ status: COURSE_STATUS.PENDING_REVIEW })
          .sort({ updatedAt: -1 })
          .limit(5)
          .populate('teacherId', 'fullName email avatar'),
        User.find()
          .sort({ createdAt: -1 })
          .limit(6)
          .select('fullName email role status createdAt')
      ]);

      const courseCounts = {
        DRAFT: 0,
        PENDING_REVIEW: 0,
        APPROVED: 0,
        REJECTED: 0,
        PUBLIC: 0,
        ARCHIVED: 0,
        total: 0
      };
      courseAgg.forEach((item) => {
        if (item._id) {
          courseCounts[item._id] = item.count;
        }
        courseCounts.total += item.count;
      });

      return ResponseUtil.success(res, {
        status: 200,
        message: 'Admin dashboard statistics retrieved successfully.',
        data: {
          metrics: {
            users: {
              total: totalUsers,
              students: totalStudents,
              teachers: totalTeachers,
              admins: totalAdmins
            },
            applications: {
              pending: pendingApps,
              approved: approvedApps,
              rejected: rejectedApps,
              total: pendingApps + approvedApps + rejectedApps
            },
            courses: courseCounts,
            categories: {
              total: totalCategories
            }
          },
          recentApplications,
          recentPendingCourses,
          recentUsers
        }
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AdminController();
