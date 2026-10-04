const mongoose = require('mongoose');
const Course = require('../../model/content/Course');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');

class CourseDAO {
  async findFeaturedCourses(limit = 6) {
    const numLimit = Math.max(1, parseInt(limit, 10) || 6);
    return Course.find({
      isFeatured: true,
      status: COURSE_STATUS.PUBLIC,
    })
      .populate('teacherId', 'fullName email avatar')
      .populate('instructorId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .limit(numLimit)
      .exec();
  }

  async findPublishedWithPaging(page = 1, limit = 10) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (parsedPage - 1) * parsedLimit;

    return Course.find({
      status: COURSE_STATUS.PUBLIC,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .exec();
  }

  async countPublished() {
    return Course.countDocuments({
      status: COURSE_STATUS.PUBLIC,
    }).exec();
  }

  async searchByKeyword(keyword, page = 1, limit = 10) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const safeRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const query = {
      status: COURSE_STATUS.PUBLIC,
      $or: [{ title: safeRegex }, { description: safeRegex }, { category: safeRegex }],
    };

    const [courses, total] = await Promise.all([
      Course.find(query)
        .sort({ averageRating: -1, totalStudents: -1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .exec(),
      Course.countDocuments(query).exec(),
    ]);

    return { courses, total };
  }

  async findByFilterAndSort({
    categoryId = null,
    category = null,
    minPrice = null,
    maxPrice = null,
    sortBy = 'newest',
    page = 1,
    limit = 10,
  } = {}) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {
      status: COURSE_STATUS.PUBLIC,
    };

    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      query.categoryId = categoryId;
    } else if (category) {
      query.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
      query.price = query.price || {};
      query.price.$gte = Number(minPrice);
    }

    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
      query.price = query.price || {};
      query.price.$lte = Number(maxPrice);
    }

    let sortOrder = { createdAt: -1 };
    switch (sortBy) {
      case 'popular':
        sortOrder = { totalStudents: -1, createdAt: -1 };
        break;
      case 'rating':
        sortOrder = { averageRating: -1, createdAt: -1 };
        break;
      case 'price-asc':
      case 'price_asc':
        sortOrder = { price: 1, createdAt: -1 };
        break;
      case 'price-desc':
      case 'price_desc':
        sortOrder = { price: -1, createdAt: -1 };
        break;
      case 'oldest':
        sortOrder = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOrder = { createdAt: -1 };
        break;
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('teacherId', 'fullName email avatar')
        .populate('instructorId', 'fullName email avatar')
        .sort(sortOrder)
        .skip(skip)
        .limit(parsedLimit)
        .exec(),
      Course.countDocuments(query).exec(),
    ]);

    return { courses, total };
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({
      _id: id,
      status: COURSE_STATUS.PUBLIC,
    }).exec();
  }

  async findCoursesByTeacherId(teacherId) {
    if (!mongoose.isValidObjectId(teacherId)) return [];
    return Course.find({
      $or: [{ teacherId }, { instructorId: teacherId }],
      status: COURSE_STATUS.PUBLIC,
    })
      .sort({ createdAt: -1 })
      .exec();
  }
}

module.exports = new CourseDAO();
