const Course = require('../../../../../model/learning/Course');
const Enrollment = require('../../../../../model/learning/Enrollment');
const QuizAttempt = require('../../../../../model/learning/QuizAttempt');
const lessonRepository = require('../learning/LessonRepository');
const { COURSE_STATUS } = require('../../../../../domain/learning/CourseStatus');

module.exports = {
  async catalog() {
    return Course.find({ deletedAt: null, status: COURSE_STATUS.PUBLIC })
      .select('_id title description category duration price').sort({ _id: 1 }).limit(300).lean();
  },
  async enrollments(userId) {
    return Enrollment.find({ userId, status: { $in: ['active', 'completed'] } })
      .select('courseId status').limit(300).lean();
  },
  async quizPerformance(userId) {
    return QuizAttempt.aggregate([
      { $match: { userId, status: 'submitted', score: { $ne: null } } },
      { $sort: { submittedAt: -1 } },
      { $limit: 100 },
      { $group: { _id: '$courseId', averageScore: { $avg: '$score' }, attempts: { $sum: 1 }, latestScore: { $first: '$score' } } },
      { $project: { _id: 0, courseId: '$_id', averageScore: { $round: ['$averageScore', 1] }, latestScore: 1, attempts: 1 } },
    ]);
  },
  async lessons(courseIds) {
    if (!courseIds.length) return [];
    const groups = await Promise.all(courseIds.map(id => lessonRepository.findPublishedByCourseId(id)));
    return groups.flat().slice(0, 300).map(lesson => ({ _id: lesson._id, courseId: lesson.courseId, sectionId: lesson.sectionId, sectionTitle: lesson.sectionTitle, title: lesson.title, content: lesson.content, duration: lesson.duration, order: lesson.order }));
  },
};
