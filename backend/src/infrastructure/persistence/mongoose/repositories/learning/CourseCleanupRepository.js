const Certificate = require('../../../../../model/learning/Certificate');
const Enrollment = require('../../../../../model/learning/Enrollment');
const Wishlist = require('../../../../../model/learning/Wishlist');
const Progress = require('../../../../../model/learning/Progress');
const CourseProgress = require('../../../../../model/learning/CourseProgress');
const VideoProgress = require('../../../../../model/learning/VideoProgress');
const Lesson = require('../../../../../model/learning/Lesson');
const Material = require('../../../../../model/learning/Material');
const Quiz = require('../../../../../model/learning/Quiz');
const QuizQuestion = require('../../../../../model/learning/QuizQuestion');
const QuizAttempt = require('../../../../../model/learning/QuizAttempt');
const Assignment = require('../../../../../model/learning/Assignment');
const DiscussionPost = require('../../../../../model/learning/DiscussionPost');
const LearningActivityLog = require('../../../../../model/learning/LearningActivityLog');

class CourseCleanupRepository {
  async removeAssociatedData(courseId) {
    const courseQuizzes = await Quiz.find({ courseId }).select('_id').lean().exec();
    const quizIds = courseQuizzes.map((quiz) => quiz._id);
    return Promise.allSettled([
      Certificate.deleteMany({ courseId }),
      Enrollment.deleteMany({ courseId }),
      Wishlist.deleteMany({ courseId }),
      Progress.deleteMany({ courseId }),
      CourseProgress.deleteMany({ courseId }),
      VideoProgress.deleteMany({ courseId }),
      Lesson.updateMany({ courseId }, { deletedAt: new Date(), isPublished: false }),
      Material.deleteMany({ courseId }),
      Quiz.deleteMany({ courseId }),
      QuizQuestion.deleteMany({ quizId: { $in: quizIds } }),
      QuizAttempt.deleteMany({ courseId }),
      Assignment.deleteMany({ courseId }),
      DiscussionPost.deleteMany({ courseId }),
      LearningActivityLog.deleteMany({ courseId }),
    ]);
  }
}

module.exports = new CourseCleanupRepository();
