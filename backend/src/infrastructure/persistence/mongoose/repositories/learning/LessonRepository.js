const mongoose = require('mongoose');
const Lesson = require('../../../../../model/learning/Lesson');

class LessonRepository {
  async findByVideoRef(videoRef) {
    return Lesson.findOne({ videoRef, deletedAt: null }).exec();
  }
  async findByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return Lesson.find({ courseId, deletedAt: null }).sort({ order: 1 }).exec();
  }

  async findPublishedByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return Lesson.find({ courseId, isPublished: true, deletedAt: null }).sort({ order: 1 }).exec();
  }

  async countByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return 0;
    return Lesson.countDocuments({ courseId, deletedAt: null });
  }

  async countValidByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return 0;
    return Lesson.countDocuments({
      courseId,
      deletedAt: null,
      title: { $type: 'string', $regex: /\S/ },
      content: { $type: 'string', $regex: /\S/ },
    });
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Lesson.findOne({ _id: id, deletedAt: null }).exec();
  }

  async findByIdIncludeDeleted(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Lesson.findById(id).exec();
  }

  async create(data) {
    return Lesson.create(data);
  }

  async update(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Lesson.findOneAndUpdate({ _id: id, deletedAt: null }, updates, { new: true, runValidators: true }).exec();
  }

  async remove(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Lesson.findByIdAndDelete(id).exec();
  }

  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Lesson.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date(), isPublished: false },
      { new: true }
    ).exec();
  }

  async maxActiveOrder(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return 0;
    const lastLesson = await Lesson.findOne({ courseId, deletedAt: null }).sort({ order: -1 }).select('order').exec();
    return lastLesson ? Number(lastLesson.order) || 0 : 0;
  }

  async normalizeOrder(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return;
    const lessons = await Lesson.find({ courseId, deletedAt: null }).sort({ order: 1, createdAt: 1 }).exec();
    for (let i = 0; i < lessons.length; i += 1) {
      if (lessons[i].order !== i + 1) {
        lessons[i].order = i + 1;
        await lessons[i].save();
      }
    }
  }

  async reorderLessons(courseId, orderedIds) {
    if (!mongoose.isValidObjectId(courseId) || !Array.isArray(orderedIds)) return [];
    const updates = orderedIds.map((id, index) =>
      Lesson.updateOne({ _id: id, courseId, deletedAt: null }, { order: index + 1 })
    );
    await Promise.all(updates);
    return this.findByCourseId(courseId);
  }

  async findFirstLesson(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return null;
    return Lesson.findOne({ courseId, deletedAt: null }).sort({ order: 1 }).exec();
  }
}

module.exports = new LessonRepository();
