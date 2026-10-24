const { enrollmentLifecycleService: EnrollmentLifecycleService } = require('../../composition/services');
const ResponseUtil = require('../../utils/common/ResponseUtil');

class EnrollmentLifecycleController {
  async cancelEnrollment(req, res, next) {
    try {
      const { enrollmentId } = req.params;
      const result = await EnrollmentLifecycleService.cancelEnrollment(enrollmentId, req.user);
      return ResponseUtil.success(res, { data: result, message: 'Enrollment cancelled successfully.' });
    } catch (error) {
      return next(error);
    }
  }

  async completeCourse(req, res, next) {
    try {
      const { enrollmentId } = req.params;
      const result = await EnrollmentLifecycleService.completeCourse(enrollmentId, req.user);
      return ResponseUtil.success(res, { data: result, message: 'Congratulations! Course completed and certificate issued.' });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new EnrollmentLifecycleController();
