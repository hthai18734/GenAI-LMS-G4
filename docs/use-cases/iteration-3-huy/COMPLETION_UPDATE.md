# Unified course completion and assignment documents

Author: Tạ Gia Huy / CE182405 / HuyTGCE182405. Updated 2026-11-08.

This document records the user's explicit follow-up decisions and supersedes the
earlier weighted final-grade design. It describes implemented code, not a proposed
second grading system.

## English interface and assignment navigation

System labels, buttons and notifications in the updated Assignment/Quiz learning
screen and Teacher assessment screens use English. Teacher/student-entered titles,
answers, instructions, feedback and filenames retain their original language.

After a successful server response, the Student dialog shows **Assignment submitted
successfully**, explains that the saved submission is awaiting grading, and moves
focus to this confirmation. It remains visible after the toast disappears. Toasts
display above modal overlays. A rejected request shows an in-dialog error and does
not replace the saved submission. Editing again clears the previous confirmation;
submission controls remain disabled while the request is pending.

Teacher Course Assignments displays each assignment on its own row with **Edit
assignment** and **View submissions** actions. **Create assignment** and **Open
Course Gradebook** are separate footer actions. The submission action always opens
that assignment's submissions; Gradebook continues to show the entire Course.

**Cancel Editing** returns to that Course's Activities tab and discards unsaved
local edits/file selection. It no longer resets the edit screen into creation mode.
Assignment Submissions has a separate **Back to Course Activities** control above
the heading, returning to the assignment's owning Course, alongside the distinct
Course Gradebook action.

Course Quizzes uses the same neutral card/list/footer styles as Course Assignments.
Each Quiz has a title and explicit **Edit quiz** link to its existing workspace;
**Create quiz** is a separate footer action. Empty states, long-title wrapping and
narrow-screen action stacking use the shared assessment card conventions.

The inner Quiz workspace also follows Assignment's centered900px frame. Course
context, configuration and question panels share the same content edges; neutral
actions and numeric inputs stack on narrow screens. Question creation/bank actions
live in one header for both empty and populated lists. Question dialogs use named
controls and responsive option rows. Save actions align left; Quiz dialogs appear
above Ask AI and below toast notifications so controls remain unobstructed.

## One authoritative result

`CourseCompletionPolicy.evaluateCompletion` evaluates published/nondeleted,
accessible activities. `ProgressTrackingService.evaluateCourseProgress` supplies
the same sources to student views, Gradebook/report and the certificate gate.

- Every required published Lesson must have completed progress. A Lesson with
  video additionally requires recorded completion or at least 90% watched.
- Every published Quiz uses its **latest submitted** attempt, sorted by submittedAt
  descending and immutable ID descending. In-progress attempts do not replace a
  submitted result; no highest-score selection remains. Pass uses the Quiz's
  configured passing score, inclusive at equality.
- Every Assignment uses its current accepted submission. Numeric score uses the
  explicitly configured Assignment passing score on its own scale; a missing
  threshold means not ready. Legacy Teacher pass/revision is supported without
  fabricating a numeric grade. Zero differs from missing/ungraded.
- All requirements must be satisfied and the Course must have at least one required
  activity. Unpublished/deleted Lessons and Quizzes and assessments linked to an
  inaccessible Lesson are excluded. An empty Course cannot complete.
- Existing learning-progress 40/30/30 percentages describe completed activities;
  they are not score averages. Eligibility requires **every** required activity,
  regardless of the displayed percentage.

## Certificates and student views

`StudentLearningService.completeLesson` records Lesson progress and invokes
`EnrollmentLifecycleService.completeCourse` only when shared eligibility is true.
The explicit enrollment-completion API invokes the same gate. That gate checks
ownership, enrollment cancellation, public/nondeleted Course availability, and
fresh eligibility **including previously completed enrollments** before issuing
or returning a certificate.

Certificate repository upsert uses the existing unique user/Course index for
idempotent concurrent completion. No certificate history is automatically deleted.
If a newer accepted submission is awaiting grading or fails, live course views
show incomplete and certificate listing hides the existing record until the shared
requirements are met again. Existing issued certificate data stays stored.
Dashboard, course list, resume and lesson responses also use current eligibility;
they no longer infer completion from Lesson counts alone.

`PUT /api/teacher/courses/:id/gradebook/policy` verifies ownership and returns410
because weighted policies are retired. Stored legacy Course.gradePolicy is ignored;
no data migration is needed to use current results. The existing calculate endpoint
remains a compatibility alias for refreshing the same completion view. The UI has no
weight, best-attempt, rounding, final-average or separate passing-threshold form.

## Deadlines and resubmission

Assignment and Quiz use server time; **now >= deadline is closed**. Multipart
Assignment submission checks access/deadline before receiving bytes and checks again
before persisting. Quiz start and submission check deadline, and attempt expiry is
the earlier of time limit and deadline. A later extension does not extend an
already-started attempt's timer. An accepted earlier result remains usable after a
deadline edit; late retry cannot overwrite it. New accepted Assignment submission
replaces current answer/file and clears grade/feedback, with revision protection
when the caller supplies the current revision.

## Section creation

UI: `/teacher/courses/:courseId/sections/new`, linked from curriculum. Fields:
**Name** (trimmed1–200) and optional **Description** (up to5000). Storage retains
`Section.title` for compatibility and adds `Section.description`. API accepts
`name, description`; legacy `title` is accepted, but name and title together are
rejected. `CourseSections` in the Lesson form is now only a selector. Existing
Course ownership/content-status checks, General section and scoped ordering remain.

## Assignment PDF/Word files

One prompt attachment and one current submission attachment, PDF/DOC/DOCX, maximum
**25 MiB** each. Text-only JSON callers remain supported. Multipart carries field
`data` containing the same JSON payload, plus a single `file`. Student answer may be
empty if a file is present. Teacher instructions/title remain required.

Metadata is embedded on `Assignment.attachment` and
`AssignmentSubmission.attachment`: randomized storageKey, original safe name,
canonical mimeType and sizeBytes. No absolute path is returned. Private local storage:
`backend/uploads/assignment-documents`; not mounted as public static content.

- Teacher ownership/editability and Student enrollment/publication/deadline are
  checked before Multer. Services recheck before the write.
- Extension and MIME must match the PDF/DOC/DOCX allowlist (octet-stream fallback
  uses extension plus content checks). PDF and DOC container signatures checked;
  DOCX ZIP must contain content types and Word document entries, with entry/expanded
  size limits and encrypted archives rejected. This is format validation, not an
  antivirus service.
- Teacher prompt create/update: existing Assignment POST/PATCH accepts multipart.
- Prompt download: `GET /api/{teacher|student}/assignments/:id/attachment`.
- Submission download: `GET /api/{teacher|student}/assignment-submissions/:id/attachment`.
- A submission is accessible only to its own Student or Course owner Teacher/admin;
  classmates and foreign Teachers are denied. Student downloads also require current
  enrollment and published Course/Lesson. Responses use no-store and nosniff.
- Browser uses authenticated blobs: PDF can open in the browser, Word downloads
  for viewing in a Word-compatible application. No backend document-to-HTML renderer.
- Validation/DB failure cleanup checks references before unlinking. Replacements
  remove unused prior files. A startup/timer sweep retries unused generated files
  older than24h. Files referenced by soft-deleted Assignments are intentionally
  retained until the referencing records are removed; failed disk/DB operations
  may delay cleanup.

## UI and notifications

Gradebook shows Lesson/video counts, latest scores, per-assessment pass states,
completion readiness and expandable remaining requirements. PDF uses those same
rows; neither screen invents final averaged scores. Narrow screens scroll the table
within its own region. The UI uses neutral panels and controls.

Success/error toasts cover Section create, Assignment create/update/settings,
Lesson/Course saves, grade save, feedback-only save, result refresh and PDF export.
Save controls show pending state and guard repeated actions; errors also stay inline.

Owner status-display follow-up: Teacher list/filter/detail, Student cards/modal and
Gradebook show **Passed** in green and **Not passed** in red. Legacy needs_revision
is translated for display only; API/filter compatibility remains intact. Saved detail
result is announced through aria-live and changes only after a successful save.
Ungraded/missing-threshold states stay neutral. Course Gradebook navigation is a
prominent dark header button, **Open Course Gradebook →**, rather than a small link.

## Manual acceptance path

1. Teacher creates a Section with description on the separate screen, returns to
   curriculum and selects it when creating Lesson; reload confirms persistence.
2. Teacher attaches PDF/Word when saving Assignment, with explicit scale/pass score
   and future deadline. Student downloads the prompt and submits a file without text.
3. Teacher opens submission, previews PDF or downloads Word, grades and saves feedback;
   success toast appears and Student sees the saved assessment.
4. Completing Lesson/video while assessments are missing must not issue a certificate.
   Pass the latest Quiz and current Assignment: Student progress and Gradebook must
   agree. Both completion APIs must return the same single certificate.
5. Submit a newer failing Quiz or a new ungraded Assignment before deadline: Course
   becomes incomplete on both sides and certificate listing is hidden. Retry at/after
   deadline: reject and preserve earlier accepted content/file/grade.
6. Foreign Teacher/classmate cannot download a private submission; wrong format,
   spoofed content, oversized file and stale submission revision are rejected.
7. Export PDF and compare scores/counts/status with Gradebook. There is no weighted
   policy form and old policy writes return410.

## Operational limits

The owner subsequently authorized feature commits and push to HuyTGCE182405;
see [DELIVERY.md](DELIVERY.md). Deployment and application-data migration remain
outside this change.
Existing certificate unique indexes predate this fix; before initializing indexes
against legacy data, inspect duplicates by userId/courseId and certificateNumber
on a backed-up test copy. Do not delete or deduplicate historical certificates
automatically. Stored certificate history and retired gradePolicy values are retained.

Report rows are live reads rather than an immutable official snapshot. Use a grading
pause for an official consistent export. Numeric scale/pass settings remain locked
after numeric grading: configure both before grading. Batch grades, submission
history, plagiarism scanning, antivirus and office document conversion remain out of scope.

Four screenshot paths supplied by the user were unavailable. Known Gradebook,
submission, Assignment and Section UI flows were updated and tested; matching any
additional screens requires the images to be reattached.
