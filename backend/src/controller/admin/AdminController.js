const UserDAO = require('../../dao/identity/UserDAO');
const PasswordUtil = require('../../utils/auth/PasswordUtil');
const ResponseUtil = require('../../utils/common/ResponseUtil');
const User = require('../../model/identity/User');
const Course = require('../../model/learning/Course');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');
const Category = require('../../model/learning/Category');
const CreateManagedUserDTO = require('../../dto/admin/CreateManagedUserDTO');
const UpdateUserRoleDTO = require('../../dto/admin/UpdateUserRoleDTO');

class AdminController {
  validationError(res, errors) {
    return ResponseUtil.error(res, {
      status: 400,
      message: Object.values(errors)[0] || 'Validation failed.',
      errors,
    });
  }

  toPublicUser(user) {
    return {
      id: String(user._id),
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || null,
      avatar: user.avatar || null,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || null,
    };
  }

  async listUsers(req, res, next) {
    try {
      const role = ['student', 'teacher', 'admin'].includes(req.query.role) ? req.query.role : null;
      const query = String(req.query.q || '').trim();
      const filter = {};
      if (role) filter.role = role;
      if (query) filter.$or = [
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
      const users = await User.find(filter)
        .select('fullName email phone avatar role status createdAt lastLoginAt')
        .sort({ createdAt: -1 })
        .limit(100)
        .exec();
      return ResponseUtil.success(res, { data: { users: users.map((user) => this.toPublicUser(user)) } });
    } catch (error) {
      return next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const dto = new CreateManagedUserDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const data = dto.toObject();
      if (await UserDAO.isEmailExists(data.email)) {
        return ResponseUtil.error(res, { status: 409, message: 'This email is already in use.' });
      }
      const user = await UserDAO.createUser({
        ...data,
        passwordHash: await PasswordUtil.hash(data.password),
        status: 'active',
        emailVerifiedAt: new Date(),
      });
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Account created and assigned the ' + data.role + ' role.',
        data: { user: this.toPublicUser(user) },
      });
    } catch (error) {
      if (error?.code === 11000) return ResponseUtil.error(res, { status: 409, message: 'This email is already in use.' });
      return next(error);
    }
  }

  async updateUserRole(req, res, next) {
    try {
      const dto = new UpdateUserRoleDTO(req.params, req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const { userId, role } = dto.toObject();
      if (String(req.user._id) === userId) {
        return ResponseUtil.error(res, { status: 400, message: 'You cannot change your own role.' });
      }
      const user = await UserDAO.updateRole(userId, role);
      if (!user) return ResponseUtil.error(res, { status: 404, message: 'User not found.' });
      return ResponseUtil.success(res, {
        message: 'User role updated successfully.',
        data: { user: this.toPublicUser(user) },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getDashboardStats(req, res, next) {
    try {
      const [totalUsers, totalStudents, totalTeachers, totalAdmins, courseAgg, totalCategories, recentPendingCourses, recentUsers] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'teacher' }),
        User.countDocuments({ role: 'admin' }),
        Course.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Category.countDocuments({ deletedAt: null }),
        Course.find({ status: COURSE_STATUS.PENDING_REVIEW }).sort({ updatedAt: -1 }).limit(5).populate('teacherId', 'fullName email avatar'),
        User.find().sort({ createdAt: -1 }).limit(6).select('fullName email role status createdAt'),
      ]);
      const courseCounts = { DRAFT: 0, PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0, PUBLIC: 0, ARCHIVED: 0, total: 0 };
      courseAgg.forEach((item) => {
        if (item._id) courseCounts[item._id] = item.count;
        courseCounts.total += item.count;
      });
      return ResponseUtil.success(res, {
        data: {
          metrics: {
            users: { total: totalUsers, students: totalStudents, teachers: totalTeachers, admins: totalAdmins },
            courses: courseCounts,
            categories: { total: totalCategories },
          },
          recentPendingCourses,
          recentUsers,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AdminController();
