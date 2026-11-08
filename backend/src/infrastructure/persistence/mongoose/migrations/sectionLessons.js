const { ObjectId } = require('mongoose').Types;
const journalName = 'section_migration_journal';
async function migrateSections(db, { apply = false } = {}) {
  const lessons = await db.collection('lessons').find({ sectionId: null }).sort({ courseId: 1, order: 1, _id: 1 }).toArray();
  const result = { mode: apply ? 'apply' : 'dry-run', pending: 0, migrated: 0, issues: [] };
  if (apply) await db.collection('sections').createIndex({ courseId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });
  const groups = new Map();
  for (const lesson of lessons) {
    if (!lesson.courseId || !ObjectId.isValid(lesson.courseId)) { result.issues.push({ lessonId: String(lesson._id), reason: 'invalid courseId' }); continue; }
    const key = String(lesson.courseId); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(lesson);
  }
  for (const rows of groups.values()) {
    const courseId = rows[0].courseId;
    const course = await db.collection('courses').findOne({ _id: courseId, deletedAt: null });
    if (!course) { rows.forEach(row => result.issues.push({ lessonId: String(row._id), reason: 'missing/deleted course' })); continue; }
    result.pending += rows.length;
    if (!apply) continue;
    let section = await db.collection('sections').findOne({ courseId, isDefault: true });
    if (section?.deletedAt) { result.issues.push({ courseId: String(courseId), reason: 'default section is deleted' }); continue; }
    if (!section) {
      const last = await db.collection('sections').findOne({ courseId }, { sort: { order: -1 } });
      section = { _id: new ObjectId(), courseId, title: 'General', order: (last?.order || 0) + 1, isDefault: true, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), migrationCreated: true };
      await db.collection('sections').insertOne(section);
    }
    // Keep the legacy order exactly; ties are broken by immutable lesson ID.
    for (const row of rows) {
      await db.collection(journalName).updateOne({ _id: row._id }, { $setOnInsert: { courseId, assignedSectionId: section._id, oldSectionId: row.sectionId ?? null, hadSectionId: Object.hasOwn(row, 'sectionId'), order: row.order } }, { upsert: true });
      const changed = await db.collection('lessons').updateOne({ _id: row._id, courseId, sectionId: null }, { $set: { sectionId: section._id } });
      result.migrated += changed.modifiedCount;
    }
  }
  const linked = await db.collection('lessons').find({ sectionId: { $ne: null } }).toArray();
  for (const row of linked) {
    const section = await db.collection('sections').findOne({ _id: row.sectionId });
    const course = await db.collection('courses').findOne({ _id: row.courseId, deletedAt: null });
    if (!course || !section || section.deletedAt || String(section.courseId) !== String(row.courseId)) result.issues.push({ lessonId: String(row._id), reason: 'invalid/deleted section or course relationship' });
  }
  return result;
}
async function rollbackSections(db, { apply = false } = {}) {
  const rows = await db.collection(journalName).find().toArray();
  const result = { mode: apply ? 'rollback' : 'rollback-dry-run', pending: rows.length, restored: 0, conflicts: [] };
  for (const row of rows) {
    if (!apply) continue;
    const updated = await db.collection('lessons').updateOne({ _id: row._id, courseId: row.courseId, sectionId: row.assignedSectionId, order: row.order },
      row.hadSectionId ? { $set: { sectionId: row.oldSectionId } } : { $unset: { sectionId: '' } });
    if (updated.modifiedCount) { result.restored++; await db.collection(journalName).deleteOne({ _id: row._id }); }
    else result.conflicts.push(String(row._id));
  }
  if (apply) {
    for (const section of await db.collection('sections').find({ migrationCreated: true }).toArray()) {
      if (!await db.collection('lessons').countDocuments({ sectionId: section._id })) await db.collection('sections').deleteOne({ _id: section._id });
    }
  }
  return result;
}
module.exports = { migrateSections, rollbackSections };
