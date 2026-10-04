const mongoose = require('mongoose');
const Lesson = require('../../model/learning/Lesson');

class LessonDAO {
  async findByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return [];
    return Lesson.find({ courseId }).sort({ order: 1 }).exec();
  }

  async countByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return 0;
    return Lesson.countDocuments({ courseId });
  }

  async countValidByCourseId(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return 0;
    return Lesson.countDocuments({
      courseId,
      title: { $type: 'string', $regex: /\S/ },
      content: { $type: 'string', $regex: /\S/ },
    });
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Lesson.findById(id).exec();
  }

  async create(data) {
    return Lesson.create(data);
  }

  async update(id, updates) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Lesson.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).exec();
  }

  async remove(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Lesson.findByIdAndDelete(id).exec();
  }

  async findFirstLesson(courseId) {
    if (!mongoose.isValidObjectId(courseId)) return null;
    return Lesson.findOne({ courseId }).sort({ order: 1 }).exec();
  }
}

module.exports = new LessonDAO();
