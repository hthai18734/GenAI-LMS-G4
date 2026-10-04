const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/model/identity/User');
const Category = require('../src/model/learning/Category');
const Course = require('../src/model/learning/Course');
const Lesson = require('../src/model/learning/Lesson');
const Enrollment = require('../src/model/learning/Enrollment');
const ChatContextService = require('../src/service/chat/ChatContextService');
const samples = require('./data/chatDemoCourses');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const teacher = await User.findOne({ email: 'teacher@ai-lms.edu', role: 'teacher', status: 'active' });
  if (!teacher) throw new Error('Cần tài khoản teacher@ai-lms.edu có role teacher và trạng thái active.');
  const specified = process.argv.slice(2);
  const emails = specified.length ? specified : ['student1@ai-lms.edu', 'student2@ai-lms.edu'];
  const students = await User.find({ email: { $in: emails }, role: 'student', status: 'active' });
  if (specified.length && students.length !== new Set(emails).size) throw new Error('Một email không tồn tại hoặc không phải học viên active.');
  const category = await Category.findOneAndUpdate({ normalizedName: 'chat demo', deletedAt: null }, {
    $setOnInsert: { name: 'Chat Demo', normalizedName: 'chat demo', description: 'Khóa học mẫu kiểm tra trợ lý AI', isActive: true },
  }, { upsert: true, new: true, runValidators: true });
  const output = [];
  for (const sample of samples) {
    let course = await Course.findOne({ slug: sample.slug });
    if (!course) course = await Course.create({
      title: sample.title, slug: sample.slug, description: sample.description,
      teacherId: teacher._id, instructorId: teacher._id, categoryId: category._id,
      category: category.name, status: 'open', price: 0,
      duration: sample.lessons.reduce((sum, lesson) => sum + lesson.duration, 0),
    });
    if (course.deletedAt || String(course.teacherId) !== String(teacher._id)) throw new Error('Khóa mẫu đã bị xóa hoặc đổi chủ sở hữu; không ghi đè dữ liệu.');
    for (const [index, lesson] of sample.lessons.entries()) {
      await Lesson.updateOne({ courseId: course._id, order: index + 1 }, {
        $setOnInsert: { ...lesson, courseId: course._id, order: index + 1 },
      }, { upsert: true, runValidators: true });
    }
    for (const student of students) {
      // Do not reset existing progress or reactivate an intentionally dropped enrollment.
      await Enrollment.updateOne({ userId: student._id, courseId: course._id }, {
        $setOnInsert: { userId: student._id, courseId: course._id, status: 'active', enrolledAt: new Date() },
      }, { upsert: true, runValidators: true });
    }
    const lessons = await Lesson.find({ courseId: course._id }).sort({ order: 1 });
    const accessibleStudents = [];
    for (const student of students) {
      const enrollment = await Enrollment.findOne({ userId: student._id, courseId: course._id, status: { $in: ['active', 'completed'] } });
      if (!enrollment) continue;
      for (const lesson of lessons) await new ChatContextService().resolve(student, { courseId: course._id, lessonId: lesson._id });
      accessibleStudents.push(student.email);
    }
    output.push({ title: course.title, courseId: String(course._id), lessons: lessons.length, learnPath: `/courses/${course._id}/learn`, enrolledStudents: accessibleStudents });
  }
  console.log(JSON.stringify({ courses: output, teacher: teacher.email }, null, 2));
}
main().catch(error => {
  // Avoid printing connection strings from database/network errors.
  console.error(error.name === 'Error' ? error.message : `Seed thất bại (${error.name}).`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
