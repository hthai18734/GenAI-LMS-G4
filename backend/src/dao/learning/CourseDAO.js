const mongoose = require('mongoose');
const Course = require('../../model/learning/Course');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');

class CourseDAO {
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findOpenById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({ _id: id, status: COURSE_STATUS.PUBLIC, deletedAt: null }).exec();
  }

  async findAllOpen() {
    return Course.find({ status: COURSE_STATUS.PUBLIC, deletedAt: null }).sort({ createdAt: -1 }).exec();
  }

  async create(data) { return Course.create(data); }

  async findTeacherCourseById(id, teacherId) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Course.findOne({ _id: id, teacherId, deletedAt: null }).exec();
  }

  async findAllByTeacher(teacherId, query) {
    const filter = { teacherId, deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.search) filter.$or = [{ title: { $regex: query.search, $options: 'i' } }, { description: { $regex: query.search, $options: 'i' } }];
    const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
    const [courses, total] = await Promise.all([
      Course.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).exec(),
      Course.countDocuments(filter),
    ]);
    return { courses, total };
  }

  async findModerationQueue(query) {
    const filter = { deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.search) filter.$or = [{ title: { $regex: query.search, $options: 'i' } }, { description: { $regex: query.search, $options: 'i' } }];
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

module.exports = new CourseDAO();
