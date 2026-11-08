# Section Migration and Recovery

Author: Tạ Gia Huy (CE182405 / HuyTGCE182405). Created: 2026-11-07.

## Implemented expand phase

`Section.courseId` references Course; `Lesson.sectionId` references Section. Keep the
required `Lesson.courseId` for existing materials, assessments, video and progress.
Service writes validate active Section and matching Course. Missing Section from an
old caller resolves to the Course's single default General Section.

Schema permits null sectionId while legacy data is backfilled. Existing reads retain
legacy Lessons, place them after sectioned Lessons and preserve IDs. Sectioned reads
exclude records with missing/deleted/foreign Sections. Ordering is Section.order,
Section ID, Lesson.order, Lesson ID. No Section delete endpoint is implemented.

## Before running

1. Take a tested backup of the named local/test database, including lessons, sections
   and all referenced collections. Record the application revision.
2. Stop curriculum writers during migration/rollback. Do not overlap two apply runs.
3. Run on a disposable restored **local/test** copy and inspect every issue.
4. Never use application `.env` as an implicit connection source. The CLI does not load it.

## Commands (from backend)

```powershell
# Explicit local database; default is a read-only dry-run.
npm.cmd run migrate:sections -- --uri mongodb://127.0.0.1:27017 --database ai_lms_local
# Apply after reviewing the dry-run and backup.
npm.cmd run migrate:sections -- --uri mongodb://127.0.0.1:27017 --database ai_lms_local --apply
# A second dry-run should have zero eligible pending records.
npm.cmd run migrate:sections -- --uri mongodb://127.0.0.1:27017 --database ai_lms_local
# Preview / apply recovery.
npm.cmd run migrate:sections -- --uri mongodb://127.0.0.1:27017 --database ai_lms_local --rollback
npm.cmd run migrate:sections -- --uri mongodb://127.0.0.1:27017 --database ai_lms_local --rollback --apply
```

The CLI requires localhost URI, an explicit database name containing test/local/dev,
and rejects NODE_ENV=production. It intentionally does not support production apply.
Any future production procedure requires separate authorization and an operational plan.

## What apply changes

- Scan Lessons with missing/null sectionId; validate their Course exists and is active.
- Reuse/create the one General Section per Course, protected by the partial unique default index.
- Journal original sectionId presence/value and order in `section_migration_journal` before updating.
- Set sectionId only while it remains missing/null and the Course still matches.
- Keep Lesson ID, order, videoRef, material/assignment/quiz/progress references, publication,
  deletedAt and timestamps unchanged. No lesson is reassigned to another Course.
- Report invalid/missing/deleted Course references and inconsistent existing Section links.
- Re-running skips already migrated records and reuses the default Section.

## Verify afterward

1. Inspect pending/issue counts; resolve orphan/invalid records separately, not automatically.
2. Confirm every migrated Lesson.sectionId resolves to matching Section.courseId.
3. Compare Lesson counts, IDs, old order and linked assessment/material/progress IDs with backup.
4. Open Teacher curriculum, Student Learn/resume, previous/next Lesson, materials, video and AI sources.
5. Test scoped reorder and a rejected cross-Course Section assignment.

## Rollback

Rollback only restores records still pointing at the journaled Section with unchanged
Course and order. Moved/reordered/deleted records are returned as conflicts for manual
review. It does not overwrite subsequent video/content/progress edits. Migration-created
Sections are removed only when no Lesson references them. Sections containing new
Lessons are retained. Review conflicts before resuming writers.

Application rollback can retain the added fields: old code still reads courseId.
Do not drop sections/sectionId until all readers and writers have been audited.

## Implementation and tests

- `backend/scripts/migrate-sections.js`
- `backend/src/infrastructure/persistence/mongoose/migrations/sectionLessons.js`
- `backend/tests/controller/SectionMigration.integration.test.js`
- Migration has been exercised only against isolated mongodb-memory-server test DBs.
