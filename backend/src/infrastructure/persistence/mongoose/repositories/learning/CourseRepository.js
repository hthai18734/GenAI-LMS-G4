/**
Author: HuyTG - CE182405
Created at: 29/09/2026
Description: Course Management
 */
const mongoose = require('mongoose');
require('../../../../../model/identity/User');
const Course = require('../../../../../model/learning/Course');
const { COURSE_STATUS } = require('../../../../../domain/learning/CourseStatus');

const COURSE_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'title', 'status']);
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeListQuery(query = {}) {
  const pageNumber = Number(query.page);
  const limitNumber = Number(query.limit);
  const validSort = COURSE_SORT_FIELDS.has(query.sortBy);
  return {
    ...query,
    page: Number.isSafeInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 1000000 ? pageNumber : 1,
    limit: Number.isSafeInteger(limitNumber) && limitNumber >= 1 ? Math.min(limitNumber, 100) : 20,
    sortBy: validSort ? query.sortBy : 'updatedAt',
    sortOrder: validSort && ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : 'desc',
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '',
  };
}

class CourseRepository {
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findOpenById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({ _id: id, status: COURSE_STATUS.PUBLIC, deletedAt: null }).exec();
  }

  findPublicForCheckout(id, session = null) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({ _id: id, status: COURSE_STATUS.PUBLIC, deletedAt: null }).session(session).lean().exec();
  }

  async findAllOpen() {
    return Course.find({ status: COURSE_STATUS.PUBLIC, deletedAt: null }).sort({ createdAt: -1 }).exec();
  }

  async create(data) { return Course.create(data); }

  async findTeacherCourseById(id, teacherId) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({ _id: id, teacherId, deletedAt: null }).exec();
  }

  async findByTeacherId(teacherId) {
    if (!mongoose.isValidObjectId(teacherId)) return [];
    return Course.find({
      $or: [
        { teacherId },
        { instructorId: teacherId },
      ],
      deletedAt: null,
    }).exec();
  }

  async findDashboardCourses(teacherId) {
    if (!mongoose.isValidObjectId(teacherId)) return [];
    return Course.find({
      $or: [{ teacherId }, { instructorId: teacherId }],
      deletedAt: null,
    }).sort({ updatedAt: -1 }).exec();
  }

  async countByStatus() {
    return Course.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();
  }

  async findRecentByStatus(status, limit = 5) {
    return Course.find({ status, deletedAt: null })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('teacherId', 'fullName email avatar')
      .exec();
  }

  async findCoursesByTeacherId(teacherId) {
    return this.findByTeacherId(teacherId);
  }

  async findIdsByTeacher(teacherId) {
    return Course.find({
      $or: [
        { teacherId },
        { instructorId: teacherId },
      ],
      deletedAt: null,
    }).select('_id').lean().exec();
  }

  async findAllByTeacher(teacherId, query) {
    query = normalizeListQuery(query);
    const filter = { teacherId, deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.search) {
      const search = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ title: { $regex: search } }, { description: { $regex: search } }];
    }
    const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
    const [courses, total] = await Promise.all([
      Course.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).exec(),
      Course.countDocuments(filter),
    ]);
    return { courses, total };
  }

  async findModerationQueue(query) {
    query = normalizeListQuery(query);
    const filter = { deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const search = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ title: { $regex: search } }, { description: { $regex: search } }];
    }
    const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
    const [courses, total] = await Promise.all([
      Course.find(filter).populate('teacherId', 'fullName email').sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).exec(),
      Course.countDocuments(filter),
    ]);
    return { courses, total };
  }

  async findByIdForModeration(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({ _id: id, deletedAt: null }).populate('teacherId', 'fullName email').exec();
  }

  async update(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOneAndUpdate({ _id: id, deletedAt: null }, updates, { new: true, runValidators: true }).exec();
  }

  async transitionStatus(id, currentStatus, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOneAndUpdate(
      { _id: id, status: currentStatus, deletedAt: null },
      updates,
      { new: true, runValidators: true }
    ).exec();
  }

  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date() }, { new: true }).exec();
  }

  async updateCategoryName(categoryId, category) {
    if (!mongoose.isValidObjectId(categoryId)) return null;
    return Course.updateMany({ categoryId, deletedAt: null }, { category }).exec();
  }

  async incrementStudents(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.updateOne({ _id: id, deletedAt: null }, { $inc: { totalStudents: 1 } }).exec();
  }
}

module.exports = new CourseRepository();
