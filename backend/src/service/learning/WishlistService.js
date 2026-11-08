const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

class WishlistService {
  constructor({ wishlistRepository, courseRepository, enrollmentRepository } = {}) {
    this.wishlistRepository = wishlistRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  async addToWishlist(studentId, courseId) {
    this.assertValidId(studentId, 'Student ID');
    this.assertValidId(courseId, 'Course ID');

    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt || course.status !== COURSE_STATUS.PUBLIC) {
      throw new ServiceError(404, 'Course not found or is not currently available for wishlist.');
    }

    await this.wishlistRepository.add(studentId, courseId);
    const enrolled = await this.enrollmentRepository.findActiveEnrollment(studentId, courseId);
    if (enrolled) {
      return { saved: true, message: 'You are already enrolled in this course.', alreadyEnrolled: true, courseId: String(courseId) };
    }

    return { saved: true, courseId: String(courseId) };
  }

  async getWishlist(studentId, { page = 1, limit = 10 } = {}) {
    this.assertValidId(studentId, 'Student ID');
    const result = await this.wishlistRepository.findByStudent(studentId, { page, limit });

    const courses = result.items
      .filter((item) => item.courseId && !item.courseId.deletedAt)
      .map((item) => {
        const c = item.courseId;
        return {
          id: String(c._id),
          courseId: String(c._id),
          title: c.title,
          description: c.description,
          thumbnail: c.thumbnail,
          category: c.category,
          price: c.price || 0,
          discountPrice: c.discountPrice || null,
          duration: c.duration || 0,
          averageRating: c.averageRating || 0,
          totalStudents: c.totalStudents || 0,
          teacherName: c.teacherId?.fullName || 'Instructor',
          addedAt: item.addedAt,
        };
      });

    return {
      courses,
      pagination: {
        page: Math.max(1, page),
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    };
  }

  async removeFromWishlist(studentId, courseId) {
    this.assertValidId(studentId, 'Student ID');
    this.assertValidId(courseId, 'Course ID');
    await this.wishlistRepository.remove(studentId, courseId);
    return true;
  }
}

module.exports = WishlistService;
