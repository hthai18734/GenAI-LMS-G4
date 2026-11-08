const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { migrateSections, rollbackSections } = require('../../src/infrastructure/persistence/mongoose/migrations/sectionLessons');
test('section migration is dry by default, rerunnable, preserves links and has guarded rollback', { skip: !process.env.TEST_MONGODB_URI }, async t => {
  await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName: `ai_lms_sections_test_${crypto.randomBytes(6).toString('hex')}` });
  const db = mongoose.connection.db;
  t.after(async () => { await db.dropDatabase(); await mongoose.disconnect(); });
  const courseId = new mongoose.Types.ObjectId(), orphanCourse = new mongoose.Types.ObjectId();
  await db.collection('courses').insertOne({ _id: courseId, title: 'Legacy' });
  const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  await db.collection('lessons').insertMany(ids.map((_id, i) => ({ _id, courseId, order: 8 - i * 4, videoRef: 'keep.mp4' })));
  await db.collection('lessons').insertOne({ courseId: orphanCourse, title: 'Orphan', order: 1 });
  const linkedCollections = ['materials', 'assignments', 'quizzes', 'progresses', 'videoprogresses', 'quizattempts'];
  const links = {};
  for (const name of linkedCollections) {
    await db.collection(name).insertOne({ lessonId: ids[0], courseId, marker: 'preserve' });
    links[name] = await db.collection(name).find().toArray();
  }
  const dry = await migrateSections(db);
  assert.equal(dry.pending, 2); assert.equal(dry.issues.length, 1);
  assert.equal(await db.collection('sections').countDocuments(), 0);
  await migrateSections(db, { apply: true });
  await migrateSections(db, { apply: true });
  assert.equal(await db.collection('sections').countDocuments(), 1);
  const rows = await db.collection('lessons').find({ courseId }).sort({ order: 1 }).toArray();
  assert.equal(String(rows[0]._id), String(ids[1])); assert.equal(rows[0].videoRef, 'keep.mp4');
  assert.equal((await migrateSections(db)).pending, 0);
  for (const name of linkedCollections) assert.deepEqual(await db.collection(name).find().toArray(), links[name]);
  await rollbackSections(db, { apply: true });
  const restored = await db.collection('lessons').findOne({ _id: ids[0] });
  assert.equal(restored.order, 8); assert.equal(restored.sectionId, undefined);
  assert.equal(await db.collection('sections').countDocuments(), 0);
});
