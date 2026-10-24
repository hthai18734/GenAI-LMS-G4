const mongoose = require('mongoose');
const Category = require('../../model/learning/Category');
const Course = require('../../model/learning/Course');
const { COURSE_STATUS } = require('../../model/learning/CourseStatus');

class CategoryDAO {
  async create(data) { return Category.create(data); }
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Category.findOne({ _id: id, deletedAt: null }).exec();
  }
  async findByNameCaseInsensitive(normalizedName, excludeId = null) {
    const filter = { normalizedName, deletedAt: null };
    if (excludeId) filter._id = { $ne: excludeId };
    return Category.findOne(filter).exec();
  }
  async findAll() { return Category.find({ deletedAt: null }).sort({ name: 1 }).exec(); }
  async findAllActive() { return Category.find({ deletedAt: null, isActive: true }).sort({ name: 1 }).exec(); }
  async findActiveById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Category.findOne({ _id: id, deletedAt: null, isActive: true }).exec();
  }
  async update(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Category.findOneAndUpdate({ _id: id, deletedAt: null }, updates, { new: true, runValidators: true }).exec();
  }
  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Category.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date(), isActive: false }, { new: true }).exec();
  }
  async isUsedByActiveCourse(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    return Boolean(await Course.exists({
      categoryId: id,
      deletedAt: null,
      status: { $in: [COURSE_STATUS.DRAFT, COURSE_STATUS.PENDING_REVIEW, COURSE_STATUS.APPROVED, COURSE_STATUS.REJECTED, COURSE_STATUS.PUBLIC] },
    }));
  }
}
module.exports = new CategoryDAO();
