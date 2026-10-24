const User = require('../../model/identity/User');
const PasswordUtil = require('../auth/PasswordUtil');
const LoggerUtil = require('../common/LoggerUtil');

const ADMIN_EMAIL = 'admin';
const ADMIN_PASSWORD = 'admin@';

const TEACHER_EMAIL = 'teacher@ai-lms.edu';
const TEACHER_PASSWORD = 'teacher@';

async function seedAdmin() {
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
      const passwordHash = await PasswordUtil.hash(ADMIN_PASSWORD);
      await User.create({
        fullName: 'Admin',
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        status: 'active',
        emailVerifiedAt: new Date(),
      });
      LoggerUtil.info(`Default admin account seeded (email: ${ADMIN_EMAIL})`);
    } else {
      LoggerUtil.info('Admin account already exists, skipping seed.');
    }

    // Seed default teacher account
    const existingTeacher = await User.findOne({ email: TEACHER_EMAIL });
    if (!existingTeacher) {
      const teacherHash = await PasswordUtil.hash(TEACHER_PASSWORD);
      await User.create({
        fullName: 'Nguyễn Văn Giảng (Giảng viên)',
        email: TEACHER_EMAIL,
        phone: '0987654321',
        passwordHash: teacherHash,
        role: 'teacher',
        status: 'active',
        emailVerifiedAt: new Date(),
      });
      LoggerUtil.info(`Default teacher account seeded (email: ${TEACHER_EMAIL})`);
    } else {
      LoggerUtil.info('Teacher account already exists, skipping seed.');
    }

    // Seed sample student accounts for learning-flow testing.
    const student1Email = 'student1@ai-lms.edu';
    let student1 = await User.findOne({ email: student1Email });
    if (!student1) {
      const studentHash = await PasswordUtil.hash('student@');
      student1 = await User.create({
        fullName: 'Trần Thị Mai Lan',
        email: student1Email,
        phone: '0912345678',
        passwordHash: studentHash,
        role: 'student',
        status: 'active',
        bio: 'Kỹ sư phần mềm đam mê chia sẻ kiến thức Web Fullstack',
        emailVerifiedAt: new Date(),
      });
      LoggerUtil.info(`Default student account seeded (email: ${student1Email})`);
    }

    const student2Email = 'student2@ai-lms.edu';
    let student2 = await User.findOne({ email: student2Email });
    if (!student2) {
      const studentHash = await PasswordUtil.hash('student@');
      student2 = await User.create({
        fullName: 'Lê Hoàng Nam',
        email: student2Email,
        phone: '0923456789',
        passwordHash: studentHash,
        role: 'student',
        status: 'active',
        bio: 'Chuyên gia AI & Deep Learning, 4 năm kinh nghiệm làm việc tại tập đoàn công nghệ',
        emailVerifiedAt: new Date(),
      });
      LoggerUtil.info(`Default student account seeded (email: ${student2Email})`);
    }

    // Seed default categories if none exist
    const Category = require('../../model/learning/Category');
    const Course = require('../../model/learning/Course');
    const { COURSE_STATUS } = require('../../model/learning/CourseStatus');
    const legacyCourseStatuses = {
      draft: COURSE_STATUS.DRAFT,
      pending_review: COURSE_STATUS.PENDING_REVIEW,
      approved: COURSE_STATUS.APPROVED,
      rejected: COURSE_STATUS.REJECTED,
      open: COURSE_STATUS.PUBLIC,
      published: COURSE_STATUS.PUBLIC,
      closed: COURSE_STATUS.ARCHIVED,
      archived: COURSE_STATUS.ARCHIVED,
    };
    await Promise.all(Object.entries(legacyCourseStatuses).map(([legacyStatus, status]) => (
      Course.updateMany({ status: legacyStatus }, { $set: { status } })
    )));
    const existingCatsCount = await Category.countDocuments({ deletedAt: null });
    if (existingCatsCount === 0) {
      await Category.create({
        name: 'Artificial Intelligence',
        normalizedName: 'artificial intelligence',
        description: 'Machine learning, neural networks and LLMs',
        isActive: true,
      });
      await Category.create({
        name: 'Web Development',
        normalizedName: 'web development',
        description: 'Modern frontend and backend frameworks',
        isActive: true,
      });
      await Category.create({
        name: 'Data Science',
        normalizedName: 'data science',
        description: 'Data analysis, statistics, and visualization',
        isActive: true,
      });
      await Category.create({
        name: 'Cloud Computing',
        normalizedName: 'cloud computing',
        description: 'DevOps, Docker, Kubernetes and microservices',
        isActive: true,
      });
      LoggerUtil.info('Default categories seeded for demo.');
    }

    // Seed default courses if none exist
    const seededCourseIds = [];
    const existingCoursesCount = await Course.countDocuments();
    if (existingCoursesCount === 0) {
      const teacher = await User.findOne({ role: 'teacher' });
      const teacherId = teacher?._id || student1?._id;
      if (teacherId) {
        const firstDemoCourse = await Course.create({
          title: 'Machine Learning & Deep Learning with Python 2026',
          description: 'Học máy chuyên sâu từ cơ bản đến nâng cao với Python, PyTorch và Scikit-Learn.',
          thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=600&q=80',
          teacherId,
          instructorId: teacherId,
          category: 'Artificial Intelligence',
          status: COURSE_STATUS.PUBLIC,
          price: 49,
          duration: 1200,
          averageRating: 4.8,
          totalStudents: 156,
          isFeatured: true,
        });
        seededCourseIds.push(firstDemoCourse._id);

        const secondDemoCourse = await Course.create({
          title: 'Fullstack React & Node.js Masterclass',
          description: 'Xây dựng ứng dụng web hiện đại từ giao diện người dùng đến RESTful API backend.',
          thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80',
          teacherId,
          instructorId: teacherId,
          category: 'Web Development',
          status: COURSE_STATUS.PUBLIC,
          price: 0,
          duration: 980,
          averageRating: 4.9,
          totalStudents: 230,
          isFeatured: true,
        });
        seededCourseIds.push(secondDemoCourse._id);

        const reviewDemoCourse = await Course.create({
          title: 'Docker & Kubernetes Cloud Architecture',
          description: 'Triển khai hạ tầng đám mây và microservices với containerization chuẩn production.',
          thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=600&q=80',
          teacherId,
          instructorId: teacherId,
          category: 'Cloud Computing',
          status: COURSE_STATUS.PENDING_REVIEW,
          price: 79,
          duration: 1400,
          averageRating: 0,
          totalStudents: 0,
          isFeatured: false,
          submittedForReviewAt: new Date(),
        });
        seededCourseIds.push(reviewDemoCourse._id);
        LoggerUtil.info('Default demo courses seeded.');
      }
    }

    // Seed lessons only for demo courses created in this run. User-created drafts remain empty.
    const Lesson = require('../../model/learning/Lesson');
    const allCourses = await Course.find({ _id: { $in: seededCourseIds } });
    for (const c of allCourses) {
      const lessonCount = await Lesson.countDocuments({ courseId: c._id });
      if (lessonCount === 0) {
        await Lesson.create([
          {
            courseId: c._id,
            title: `Bài 1: Giới thiệu & Tổng quan khóa học ${c.title}`,
            content: `Chào mừng bạn đến với khóa học "${c.title}".\n\nTrong bài mở đầu này, bạn sẽ nắm bắt toàn bộ mục tiêu của khóa học, lộ trình học tập tối ưu, cũng như chuẩn bị các tài liệu, công cụ thực hành cần thiết.\n\nChúc bạn có những trải nghiệm học tập tuyệt vời!`,
            order: 1,
            duration: 15,
          },
          {
            courseId: c._id,
            title: `Bài 2: Hướng dẫn thực hành & Xây dựng dự án mẫu`,
            content: `Trong bài học này, chúng ta sẽ bắt tay vào thực hành chi tiết:\n1. Phân tích bài toán thực tế và thiết kế giải pháp.\n2. Viết mã nguồn và áp dụng các best practices.\n3. Xử lý các tình huống lỗi thường gặp khi phát triển.`,
            order: 2,
            duration: 35,
          },
          {
            courseId: c._id,
            title: `Bài 3: Tổng kết & Cấp chứng nhận hoàn thành`,
            content: `Chúc mừng bạn đã hoàn thành xuất sắc các nội dung học tập của khóa học "${c.title}"!\n\nSau khi nhấn "Mark as Completed", hệ thống AI-LMS sẽ ghi nhận tiến độ 100% và cấp chứng chỉ Certificate chính thức cho bạn trong tab Chứng chỉ.`,
            order: 3,
            duration: 20,
          },
        ]);
        LoggerUtil.info(`Default lessons seeded for course: ${c.title}`);
      }
    }
  } catch (error) {
    LoggerUtil.error('Failed to seed default accounts', error);
  }
}

module.exports = { seedAdmin };
