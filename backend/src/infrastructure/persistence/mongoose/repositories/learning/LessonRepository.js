const mongoose = require('mongoose');
const Lesson = require('../../../../../model/learning/Lesson');
const Section = require('../../../../../model/learning/Section');

class LessonRepository {
  async ordered(rows) {
    const sections = await Section.find({ _id: { $in: rows.map(row => row.sectionId).filter(Boolean) }, deletedAt: null }).lean();
    const byId = new Map(sections.map(s => [String(s._id), s]));
    return rows.map(row => row.toObject ? row.toObject() : row)
      .filter(row => !row.sectionId || String(byId.get(String(row.sectionId))?.courseId) === String(row.courseId))
      .map(row => ({ ...row, sectionTitle: byId.get(String(row.sectionId))?.title || null, sectionOrder: byId.get(String(row.sectionId))?.order ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.sectionOrder - b.sectionOrder || String(a.sectionId || '').localeCompare(String(b.sectionId || '')) || a.order - b.order || String(a._id).localeCompare(String(b._id)));
  }
  async findByVideoRef(videoRef) {
    return (await this.ordered(await Lesson.find({ videoRef, deletedAt: null }).exec()))[0] || null;
  }
  async findByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return this.ordered(await Lesson.find({ courseId, deletedAt: null }).exec());
  }

  async findPublishedByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return this.ordered(await Lesson.find({ courseId, isPublished: true, deletedAt: null }).exec());
  }

  async countByCourseId(courseId, { publishedOnly = false } = {}) {
    if (!mongoose.isValidObjectId(courseId)) return 0;
    const filter = { courseId, deletedAt: null };
    if (publishedOnly) filter.isPublished = true;
    return Lesson.countDocuments(filter);
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
    return (await this.ordered(await Lesson.find({ _id: id, deletedAt: null }).exec()))[0] || null;
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

  async maxActiveOrder(courseId, sectionId) {
    if (!mongoose.isValidObjectId(courseId)) return 0;
    const lastLesson = await Lesson.findOne({ courseId, deletedAt: null, ...(sectionId ? { sectionId } : {}) }).sort({ order: -1 }).select('order').exec();
    return lastLesson ? Number(lastLesson.order) || 0 : 0;
  }

  async normalizeOrder(courseId, sectionId) {
    if (!mongoose.isValidObjectId(courseId)) return;
    const lessons = await Lesson.find({ courseId, deletedAt: null, sectionId: sectionId || null }).sort({ order: 1, createdAt: 1 }).exec();
    for (let i = 0; i < lessons.length; i += 1) {
      if (lessons[i].order !== i + 1) {
        lessons[i].order = i + 1;
        await lessons[i].save();
      }
    }
  }

  async reorderLessons(courseId, orderedIds, sectionId) {
    if (!mongoose.isValidObjectId(courseId) || !Array.isArray(orderedIds)) return [];
    const updates = orderedIds.map((id, index) =>
      Lesson.updateOne({ _id: id, courseId, deletedAt: null, sectionId: sectionId || null }, { order: index + 1 })
    );
    await Promise.all(updates);
    return this.findByCourseId(courseId);
  }

  async findFirstLesson(courseId, { publishedOnly = false } = {}) {
    if (!mongoose.isValidObjectId(courseId)) return null;
    const lessons = await (publishedOnly ? this.findPublishedByCourseId(courseId) : this.findByCourseId(courseId));
    return lessons[0] || null;
  }
}

module.exports = new LessonRepository();
