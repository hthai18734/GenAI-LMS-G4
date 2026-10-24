const root = '../infrastructure/persistence/mongoose/repositories';
const ports = require('../application/ports/outbound/RepositoryPorts');
const assertPort = require('../application/ports/outbound/assertPort');
const toApplicationRepository = require('../infrastructure/persistence/mongoose/toApplicationRepository');

const mongooseAdapters = {
  assignmentRepository: require(`${root}/learning/AssignmentRepository`),
  assignmentSubmissionRepository: require(`${root}/learning/AssignmentSubmissionRepository`),
  categoryRepository: require(`${root}/learning/CategoryRepository`),
  certificateRepository: require(`${root}/learning/CertificateRepository`),
  chatLearningRepository: require(`${root}/chat/ChatLearningRepository`),
  chatRepository: require(`${root}/chat/ChatRepository`),
  courseCleanupRepository: require(`${root}/learning/CourseCleanupRepository`),
  courseProgressRepository: require(`${root}/learning/CourseProgressRepository`),
  courseRepository: require(`${root}/learning/CourseRepository`),
  discussionPostRepository: require(`${root}/learning/DiscussionPostRepository`),
  enrollmentRepository: require(`${root}/learning/EnrollmentRepository`),
  learningActivityLogRepository: require(`${root}/learning/LearningActivityLogRepository`),
  learningContentReportRepository: require(`${root}/learning/LearningContentReportRepository`),
  learningGoalRepository: require(`${root}/learning/LearningGoalRepository`),
  lessonRepository: require(`${root}/learning/LessonRepository`),
  materialRepository: require(`${root}/learning/MaterialRepository`),
  notificationPreferenceRepository: require(`${root}/learning/NotificationPreferenceRepository`),
  notificationRepository: require(`${root}/engagement/NotificationRepository`),
  oAuthAccountRepository: require(`${root}/identity/OAuthAccountRepository`),
  oAuthLoginTicketRepository: require(`${root}/identity/OAuthLoginTicketRepository`),
  otpVerificationRepository: require(`${root}/identity/OtpVerificationRepository`),
  progressRepository: require(`${root}/learning/ProgressRepository`),
  publicCategoryRepository: require(`${root}/content/CategoryRepository`),
  publicCourseRepository: require(`${root}/content/CourseRepository`),
  questionRepository: require(`${root}/learning/QuestionRepository`),
  quizAttemptRepository: require(`${root}/learning/QuizAttemptRepository`),
  quizQuestionRepository: require(`${root}/learning/QuizQuestionRepository`),
  quizRepository: require(`${root}/learning/QuizRepository`),
  refreshSessionRepository: require(`${root}/identity/RefreshSessionRepository`),
  reviewRepository: require(`${root}/engagement/ReviewRepository`),
  teacherApplicationRepository: require(`${root}/governance/TeacherApplicationRepository`),
  transactionRepository: require(`${root}/common/TransactionRepository`),
  userRepository: require(`${root}/identity/UserRepository`),
  videoProgressRepository: require(`${root}/learning/VideoProgressRepository`),
  voucherRedemptionRepository: require(`${root}/voucher/VoucherRedemptionRepository`),
  voucherRepository: require(`${root}/voucher/VoucherRepository`),
  wishlistRepository: require(`${root}/learning/WishlistRepository`),
};

const adapters = Object.fromEntries(
  Object.entries(mongooseAdapters).map(([name, adapter]) => [name, toApplicationRepository(adapter)])
);

for (const [name, methods] of Object.entries(ports)) {
  assertPort(name, adapters[name], methods);
}

module.exports = Object.freeze(adapters);
