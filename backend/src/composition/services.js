const repositories = require('./repositories');
const assertPort = require('../application/ports/outbound/assertPort');
const crypto = require('crypto');
const ChatContextService = require('../service/chat/ChatContextService');
const ChatLearningService = require('../service/chat/ChatLearningService');
const ChatService = require('../service/chat/ChatService');
const GeminiClient = require('../utils/ai/GeminiClient');
const EmailUtil = require('../utils/email/EmailUtil');
const PasswordUtil = require('../utils/auth/PasswordUtil');
const LoggerUtil = require('../utils/common/LoggerUtil');
const { parseDocument } = require('../utils/document/ChatDocumentParser');
const OTPUtil = require('../utils/auth/OTPUtil');
const JWTUtil = require('../utils/auth/JWTUtil');
const OAuthUtil = require('../utils/auth/OAuthUtil');
const ContentGenerationService = require('../service/ai/ContentGenerationService');
const path = require('path');
const LocalFileStorageGateway = require('../infrastructure/storage/LocalFileStorageGateway');
const createVoucherService = require('../service/voucher/VoucherService');
const createVoucherCheckoutService = require('../service/voucher/VoucherCheckoutService');
const StudentProfileService = require('../service/student/StudentProfileService');
const StudentLearningService = require('../service/student/StudentLearningService');
const StudentNotificationService = require('../service/student/StudentNotificationService');
const StudentService = require('../service/student/StudentService');

const loggerGateway = assertPort('LoggerGateway', {
  error: LoggerUtil.error.bind(LoggerUtil),
}, ['error']);
const passwordGateway = assertPort('PasswordGateway', {
  hash: PasswordUtil.hash.bind(PasswordUtil),
  compare: PasswordUtil.compare.bind(PasswordUtil),
  validate: PasswordUtil.validate.bind(PasswordUtil),
}, ['hash', 'compare', 'validate']);
const documentParserGateway = assertPort('DocumentParserGateway', { parse: parseDocument }, ['parse']);
const materialStorageGateway = assertPort(
  'MaterialStorageGateway',
  new LocalFileStorageGateway(),
  ['exists', 'removeBestEffort', 'extension'],
);
const videoStorageGateway = assertPort(
  'VideoStorageGateway',
  new LocalFileStorageGateway({
    rootDirectory: path.resolve(__dirname, '../../uploads/lesson-videos'),
  }),
  ['resolveWithin', 'removeBestEffort', 'validVideo', 'expiredVideoFilenames'],
);
const AssignmentDocumentStorageGateway = require('../infrastructure/storage/AssignmentDocumentStorageGateway');
const documentStorageGateway = assertPort('AssignmentDocumentStorageGateway', new AssignmentDocumentStorageGateway({
  rootDirectory: path.resolve(__dirname, '../../uploads/assignment-documents'),
}), ['validDocument', 'exists', 'resolveWithin', 'removeBestEffort', 'expiredDocumentFilenames']);

const create = (path, dependencies = repositories) => {
  const Service = require(path);
  return new Service(dependencies);
};

const progressTrackingService = create('../service/learning/ProgressTrackingService');
const sectionService = create('../service/learning/SectionService');
const lessonVideoService = create('../service/learning/LessonVideoService', { ...repositories, videoStorageGateway });
const courseService = create('../service/learning/CourseService', { ...repositories, loggerGateway, sectionService, lessonVideoService });
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
  documentParser: documentParserGateway,
});
const voucherService = createVoucherService(repositories);
const voucherCheckoutService = createVoucherCheckoutService({
  ...repositories,
  voucherService,
});
const studentProfileService = new StudentProfileService(repositories);
const enrollmentLifecycleService = create('../service/learning/EnrollmentLifecycleService', {
  ...repositories, progressTrackingService,
});
const studentLearningService = new StudentLearningService({ ...repositories, progressTrackingService, enrollmentLifecycleService });
const studentNotificationService = new StudentNotificationService(repositories);
const studentService = new StudentService({
  profileService: studentProfileService,
  learningService: studentLearningService,
  notificationService: studentNotificationService,
});

const services = {
  assignmentDocumentService: create('../service/learning/AssignmentDocumentService', { ...repositories, documentStorageGateway }),
  gradebookService: create('../service/learning/GradebookService', { ...repositories, courseService, progressTrackingService }),
  assignmentAssessmentService: create('../service/learning/AssignmentAssessmentService', { ...repositories, courseService, progressTrackingService }),
  sectionService,
  accountService: create('../service/admin/AccountService', { ...repositories, passwordGateway }),
  adminDashboardService: create('../service/admin/AdminDashboardService'),
  adminTeacherService: create('../service/admin/AdminTeacherService'),
  assignmentService,
  authService: create('../service/auth/AuthService', {
    ...repositories,
    cryptoGateway: crypto,
    passwordGateway,
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
  enrollmentLifecycleService,
  learningContentReportService: create('../service/learning/LearningContentReportService'),
  learningGoalService: create('../service/learning/LearningGoalService'),
  learningStatisticsService: create('../service/learning/LearningStatisticsService'),
  lessonManagementService: create('../service/learning/LessonManagementService', { ...repositories, sectionService, lessonVideoService }),
  lessonVideoService,
  materialService: create('../service/learning/MaterialService', {
    ...repositories,
    fileStorageGateway: materialStorageGateway,
  }),
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
  studentService,
  teacherDashboardService: create('../service/teacher/TeacherDashboardService'),
  wishlistService: create('../service/learning/WishlistService'),
  voucherCheckoutService,
  voucherService,
};

module.exports = Object.freeze(services);
