const repositories = require('./repositories');
const crypto = require('crypto');
const ChatContextService = require('../service/chat/ChatContextService');
const ChatLearningService = require('../service/chat/ChatLearningService');
const ChatService = require('../service/chat/ChatService');
const GeminiClient = require('../utils/ai/GeminiClient');
const EmailUtil = require('../utils/email/EmailUtil');
const PasswordUtil = require('../utils/auth/PasswordUtil');
const OTPUtil = require('../utils/auth/OTPUtil');
const JWTUtil = require('../utils/auth/JWTUtil');
const OAuthUtil = require('../utils/auth/OAuthUtil');
const ContentGenerationService = require('../service/ai/ContentGenerationService');
const path = require('path');
const createVoucherService = require('../service/voucher/VoucherService');
const createVoucherCheckoutService = require('../service/voucher/VoucherCheckoutService');

const create = (path, dependencies = repositories) => {
  const Service = require(path);
  return new Service(dependencies);
};

const progressTrackingService = create('../service/learning/ProgressTrackingService');
const courseService = create('../service/learning/CourseService');
const quizService = create('../service/learning/QuizService', { ...repositories, courseService });
const questionService = create('../service/learning/QuestionService', {
  ...repositories,
  courseService,
  quizService,
});
const assignmentService = create('../service/learning/AssignmentService', {
  ...repositories,
  courseService,
  progressTrackingService,
});
const courseModerationService = create('../service/admin/CourseModerationService', {
  ...repositories,
  courseService,
});
const chatContextService = new ChatContextService({
  course: id => repositories.courseRepository.findById(id),
  lesson: id => repositories.lessonRepository.findById(id),
  enrolled: async (userId, courseId) => Boolean(
    await repositories.enrollmentRepository.findAccessibleEnrollment(userId, courseId)
  ),
});
const chatLearningService = new ChatLearningService(repositories.chatLearningRepository);
const chatService = new ChatService({
  chatRepository: repositories.chatRepository,
  context: chatContextService,
  gemini: new GeminiClient(),
  learning: chatLearningService,
});
const voucherService = createVoucherService(repositories);
const voucherCheckoutService = createVoucherCheckoutService({
  ...repositories,
  voucherService,
});

const services = {
  accountService: create('../service/admin/AccountService'),
  adminDashboardService: create('../service/admin/AdminDashboardService'),
  adminTeacherService: create('../service/admin/AdminTeacherService'),
  assignmentService,
  authService: create('../service/auth/AuthService', {
    ...repositories,
    cryptoGateway: crypto,
    passwordGateway: PasswordUtil,
    otpGateway: OTPUtil,
    tokenGateway: JWTUtil,
    oAuthGateway: OAuthUtil,
    emailGateway: EmailUtil,
  }),
  categoryService: create('../service/learning/CategoryService'),
  chatService,
  contentGenerationService: new ContentGenerationService({ gemini: new GeminiClient({ timeoutMs: 30000 }) }),
  courseModerationService,
  courseService,
  discussionService: create('../service/learning/DiscussionService'),
  enrollmentLifecycleService: create('../service/learning/EnrollmentLifecycleService', {
    ...repositories,
    progressTrackingService,
  }),
  learningContentReportService: create('../service/learning/LearningContentReportService'),
  learningGoalService: create('../service/learning/LearningGoalService'),
  learningStatisticsService: create('../service/learning/LearningStatisticsService'),
  lessonManagementService: create('../service/learning/LessonManagementService'),
  lessonVideoService: create('../service/learning/LessonVideoService', {
    ...repositories,
    videoDirectory: path.resolve(__dirname, '../../uploads/lesson-videos'),
  }),
  materialService: create('../service/learning/MaterialService'),
  notificationService: create('../service/engagement/NotificationService'),
  progressTrackingService,
  publicCatalogService: create('../service/public/PublicCatalogService', {
    ...repositories,
    courseRepository: repositories.publicCourseRepository,
    categoryRepository: repositories.publicCategoryRepository,
  }),
  questionService,
  quizService,
  reviewService: create('../service/engagement/ReviewService'),
  studentService: create('../service/student/StudentService'),
  teacherApplicationService: create('../service/admin/TeacherApplicationService', {
    ...repositories,
    emailGateway: EmailUtil,
  }),
  teacherDashboardService: create('../service/teacher/TeacherDashboardService'),
  wishlistService: create('../service/learning/WishlistService'),
  voucherCheckoutService,
  voucherService,
};

module.exports = Object.freeze(services);
