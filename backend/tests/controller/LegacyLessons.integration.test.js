const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/model/identity/User');
const Course = require('../../src/model/learning/Course');
const Lesson = require('../../src/model/learning/Lesson');
const Enrollment = require('../../src/model/learning/Enrollment');
const restoreLegacyLessonPublication = require('../../src/infrastructure/persistence/mongoose/migrations/restoreLegacyLessonPublication');
const { studentService } = require('../../src/composition/services');

test('legacy lesson publication repair restores learning without publishing drafts or changing content', { timeout: 120000 }, async (t) => {
  const mongo = await MongoMemoryServer.create();
  t.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
  await mongoose.connect(mongo.getUri(), { dbName: 'legacy_lessons_test' });
  const [teacher, student] = await User.create(['teacher', 'student'].map((role) => ({
    fullName: `Test ${role}`, email: `${role}@legacy.test`, role, emailVerifiedAt: new Date(),
  })));
  const course = await Course.create({ title: 'Legacy Java course', teacherId: teacher._id, status: 'PUBLIC' });
  const privateCourse = await Course.create({ title: 'Not published', teacherId: teacher._id, status: 'APPROVED' });
  await Enrollment.create({ userId: student._id, courseId: course._id });
  const originalDate = new Date('2026-10-01T00:00:00Z');
  const legacyLessons = Array.from({ length: 9 }, (_, index) => ({
    _id: new mongoose.Types.ObjectId(), courseId: course._id, title: `Legacy lesson ${index + 1}`,
    content: `Original lesson content ${index + 1}`, order: index + 1, createdAt: originalDate, updatedAt: originalDate,
  }));
  const deletedLesson = { ...legacyLessons[0], _id: new mongoose.Types.ObjectId(), deletedAt: new Date() };
  const privateLesson = { ...legacyLessons[0], _id: new mongoose.Types.ObjectId(), courseId: privateCourse._id };
  await Lesson.collection.insertMany([...legacyLessons, deletedLesson, privateLesson]);
  const draft = await Lesson.create({ courseId: course._id, title: 'Explicit draft', content: 'Private', order: 10, isPublished: false });
  const newLesson = await Lesson.create({ courseId: course._id, title: 'New default draft', content: 'Private', order: 11 });

  await t.test('reproduces the blank workspace despite nine legacy lessons existing', async () => {
    const result = await studentService.getCourseLessons(student, String(course._id));
    assert.equal(result.lessons.length, 0);
    assert.equal(await Lesson.countDocuments({ courseId: course._id, isPublished: { $exists: false }, deletedAt: null }), 9);
  });
  await t.test('dry run lists the exact candidates without changing stored publication flags', async () => {
    const plan = await restoreLegacyLessonPublication(String(course._id));
    assert.equal(plan.dryRun, true);
    assert.equal(plan.candidates, 9);
    assert.equal(plan.modifiedCount, 0);
    assert.equal(await Lesson.countDocuments({ courseId: course._id, isPublished: true }), 0);
  });
  await t.test('apply restores the nine lessons, preserving explicit drafts, deletion and content', async () => {
    const result = await restoreLegacyLessonPublication(String(course._id), { apply: true });
    assert.equal(result.modifiedCount, 9);
    const workspace = await studentService.getCourseLessons(student, String(course._id));
    assert.deepEqual(workspace.lessons.map((lesson) => lesson.title), legacyLessons.map((lesson) => lesson.title));
    for (const lesson of legacyLessons) {
      const stored = await Lesson.findById(lesson._id).lean();
      assert.equal(stored.content, lesson.content);
      assert.equal(stored.updatedAt.getTime(), originalDate.getTime());
    }
    assert.equal((await Lesson.findById(draft._id).lean()).isPublished, false);
    assert.equal((await Lesson.findById(newLesson._id).lean()).isPublished, false);
    assert.equal(Object.hasOwn(await Lesson.collection.findOne({ _id: deletedLesson._id }), 'isPublished'), false);
    assert.equal(Object.hasOwn(await Lesson.collection.findOne({ _id: privateLesson._id }), 'isPublished'), false);
  });
  await t.test('repair is idempotent and refuses a course that the teacher has not published', async () => {
    assert.equal((await restoreLegacyLessonPublication(String(course._id), { apply: true })).modifiedCount, 0);
    await assert.rejects(restoreLegacyLessonPublication(String(privateCourse._id), { apply: true }), /must exist and be PUBLIC/);
    await assert.rejects(restoreLegacyLessonPublication('bad-id', { apply: true }), /valid course ID/);
  });
});
