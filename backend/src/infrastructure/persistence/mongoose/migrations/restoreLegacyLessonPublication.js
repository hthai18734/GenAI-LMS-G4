const mongoose = require('mongoose');
const Course = require('../../../../model/learning/Course');
const Lesson = require('../../../../model/learning/Lesson');
const { COURSE_STATUS } = require('../../../../domain/learning/CourseStatus');

// Earlier Lesson schemas discarded isPublished. Repair only missing fields in an
// explicitly selected PUBLIC course; explicit draft/deleted lessons stay private.
module.exports = async function restoreLegacyLessonPublication(courseId, { apply = false } = {}) {
  if (!mongoose.isValidObjectId(courseId)) throw new Error('A valid course ID is required.');
  const course = await Course.findOne({ _id: courseId, status: COURSE_STATUS.PUBLIC, deletedAt: null })
    .select('title').lean().exec();
  if (!course) throw new Error('The selected course must exist and be PUBLIC.');

  const filter = { courseId, isPublished: { $exists: false }, deletedAt: null };
  const lessons = await Lesson.find(filter).sort({ order: 1, _id: 1 }).select('_id title order').lean().exec();
  let modifiedCount = 0;
  if (apply && lessons.length) {
    const result = await Lesson.updateMany({ ...filter, _id: { $in: lessons.map((lesson) => lesson._id) } },
      { $set: { isPublished: true } }, { timestamps: false });
    modifiedCount = result.modifiedCount;
  }
  return { courseId: String(course._id), courseTitle: course.title, dryRun: !apply, candidates: lessons.length, modifiedCount, lessons };
};
