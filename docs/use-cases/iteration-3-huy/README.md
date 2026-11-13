# Iteration 3 — Tạ Gia Huy

Author: **Tạ Gia Huy** · Student ID: **CE182405** · Alias: **HuyTGCE182405**
Started: **2026-11-07** · Specifications/review: **2026-11-08** · Iteration: **3**

Current follow-up: [Unified course completion and assignment files](COMPLETION_UPDATE.md) supersedes the earlier weighted-grade design.

This package describes implemented behavior and review decisions. It does not replace
`docs/ARCHITECTURE.md`. Specs use English, matching the existing English UC diagrams.
No authoritative RDS, complete UC catalogue or business-rule registry was found in this
checkout. Existing diagrams describe some fields absent from the baseline code.

## UC → UI → API → Service → Repository → Model

All paths below are relative to `backend/src` unless prefixed with `frontend/src`.
API paths start with `/api/teacher`; `/api/v1/teacher` aliases are also mounted.

| UC | Status | UI | Main API | Service → Repository → Model | Specification |
|---|---|---|---|---|---|
| UC-15.1 Create Section | Implemented name/description form; legacy backfill requires explicit migration | Separate TeacherSectionCreatePage; Lesson selector only | POST, GET `/courses/:courseId/sections` | SectionService / SectionRepository / Section.title and description | [Spec](UC-15.1-create-section.md) |
| UC-16.2 Upload Video | Implemented local storage, pending-upload cleanup | Course lesson editor | POST `/uploads/lesson-video?courseId=…`; lesson POST/PATCH | LessonVideoService + CourseService → VideoUploadRepository/LessonRepository → VideoUpload/Lesson | [Spec](UC-16.2-upload-video.md) |
| UC-17.2 Set Assignment Deadline | Implemented; closes at equality | Assignment editor, settings-only save | PATCH `/assignments/:assignmentId` | AssignmentService → AssignmentRepository → Assignment | [Spec](UC-17.2-set-assignment-deadline.md) |
| UC-17.3 View Assignment Submissions | Implemented list/detail/pagination/status filter | TeacherAssignmentSubmissionsPage | GET `/assignments/:id/submissions`; `/assignment-submissions/:id` | AssignmentAssessmentService → AssignmentSubmissionRepository → AssignmentSubmission | [Spec](UC-17.3-view-assignment-submissions.md) |
| UC-17.4 Grade Assignment Submission | Implemented numeric and legacy grading | Submission detail editor | PATCH `/assignment-submissions/:id/grade` | AssignmentAssessmentService → AssignmentSubmissionRepository → AssignmentSubmission | [Spec](UC-17.4-grade-assignment-submission.md) |
| UC-17.5 Give Assignment Feedback | Implemented independent or with grade | Submission detail / student Learn modal | PATCH `/assignment-submissions/:id/feedback` | AssignmentAssessmentService → AssignmentSubmissionRepository → AssignmentSubmission | [Spec](UC-17.5-give-assignment-feedback.md) |
| UC-19.1 View Gradebook | Implemented; owner Teacher only | TeacherGradebookPage | GET `/courses/:id/gradebook` | GradebookService / GradebookRepository roster / ProgressTrackingService / live learning sources | [Spec](UC-19.1-view-gradebook.md) |
| UC-19.2 Enter Student Grades | Implemented single-row existing Assignment submission entry | Gradebook link → submission editor | Existing PATCH `/assignment-submissions/:id/grade` | Same grading use case/source as UC-17.4 | [Spec](UC-19.2-enter-student-grades.md) |
| UC-19.3 Calculate Final Grade | Superseded by shared course completion; no weighted final grade | Gradebook / Refresh Results | GET `/courses/:id/gradebook`; POST `/courses/:id/gradebook/calculate` compatibility alias; policy PUT returns410 | GradebookService / ProgressTrackingService / CourseCompletionPolicy / live learning sources | [Spec](UC-19.3-calculate-final-grade.md) |
| **UC-19.4 Proposed** Generate Grade Report | PDF implementation; UC ID needs review | Gradebook / Download Report (PDF) | GET `/courses/:id/grade-report` supplies authorized report data | GradebookService.report → same repositories/sources as Gradebook | [Spec](UC-19.4-generate-grade-report.md) |

## Existing Assignment CRUD specification drafts

Existing Assignment CRUD has additional implementation-aligned SRS drafts in the
requested **a. Functional Description / b. Business Rules** format. These document
existing functions, not additional Iteration 3 implementations. Their UC IDs and
new DRAFT-ASG rule identifiers are **proposed**, pending the authoritative registry:

- [UC-17.6 Update Assignment (Proposed ID)](UC-17.6-update-assignment.md).
- [UC-17.7 Delete Assignment (Proposed ID)](UC-17.7-delete-assignment.md).

## Confirmed owner decisions (this implementation session)

- Reject submission at **server time >= deadline**; persist UTC and display local time.
- Use one shared completion result: all Lesson/video requirements and latest submitted Quiz/Assignment pass; no weighted final grade or best-attempt policy. Configure each assessment passing score explicitly.
- Manual grade entry edits existing Assignment submissions, not separate overrides.
- Saved grades/feedback become immediately visible to their student.
- Export PDF using the repository's existing `html2pdf.js` dependency.

## Rule identifiers and review status

No existing BR-ID registry was found. These are **local identifiers**, not claimed RDS IDs.

| Local ID | Rule | Basis/status |
|---|---|---|
| I3-HUY-R01 | Authenticated active Teacher must own Course; content writes require DRAFT/REJECTED/APPROVED | Existing architecture/access policy |
| I3-HUY-R02 | Section belongs to Course; new Lesson resolves Section and keeps matching courseId | Explicit user request |
| I3-HUY-R03 | Old clients use General section; section order within Course, lesson order within Section; ties by immutable ID | Implemented compatibility decision; Proposed for review |
| I3-HUY-R04 | Deadline has offset, stores UTC; equality is closed; changes preserve existing submissions | Owner confirmed |
| I3-HUY-R05 | Numeric grade requires explicit positive maxScore; optional same-scale passingScore; no scale change after numeric grading | Explicit configuration confirmed; scale locking Proposed |
| I3-HUY-R06 | Missing/ungraded and missing passing threshold prevent completion; zero remains a real grade | Owner follow-up confirmed |
| I3-HUY-R07 | Latest submitted Quiz/current accepted Assignment only; ignore legacy gradePolicy | Owner follow-up confirmed |
| I3-HUY-R08 | Student views, Gradebook/report and certificate gates share CourseCompletionPolicy | Owner follow-up confirmed; replaces rounding/weighted design |
| I3-HUY-R09 | Saved grade/feedback visible immediately to the submitting enrolled student | Owner confirmed |
| I3-HUY-R10 | Authorized teacher PDF report uses Gradebook service and source records | Owner confirmed format |
| I3-HUY-R11 | Manual entry targets one existing Assignment submission; Quiz overrides/additional manual components unsupported | Owner confirmed scope |
| I3-HUY-R12 | Concurrent submission edits use revision checks; batches unsupported | Implemented concurrency contract; Proposed for review |
| I3-HUY-R13 | Resubmission replaces the one current submission and clears its grading/feedback | Baseline behavior preserved; review retention policy |

## Scope and limits

- Section delete, rename, reorder and full CRUD are not provided. Course deletion soft-deletes Sections/Lessons.
- Nullable legacy `Lesson.sectionId` is an expand-phase compatibility allowance. All service-created Lessons resolve a Section. Run the migration before treating all stored Lessons as sectioned.
- Completion is a live view. New accepted work/grades can change readiness; issued certificate history is retained but visibility is gated by current eligibility.
- No weighted average, provisional grade, best-attempt selection or separate final passing threshold remains.
- Assignment prompt/submission PDF/DOC/DOCX files are supported (one each,25 MiB); authenticated PDF preview/Word download. Extra assessment types, exemptions and submission history remain unsupported.
- Learning-progress percentages retain existing activity-completion weights40/30/30. Every required activity must pass for completion; these weights never average numerical grades. Both certificate issuance paths now use the shared completion gate.
- Report data is authorized on backend; PDF rendering/download runs in the browser. PDF is the only added format.
- Review [COMPLETION_UPDATE.md](COMPLETION_UPDATE.md), [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md), [Section migration](SECTION_MIGRATION.md), [verification](VERIFICATION.md), and the [changed-file manifest](CHANGES.md).

## Official framework references consulted

- [Mongoose 8 atomic updates](https://mongoosejs.com/docs/8.x/docs/tutorials/findoneandupdate.html)
- [Mongoose 8 update validation](https://mongoosejs.com/docs/8.x/docs/validation.html)
- [React effect cleanup](https://react.dev/reference/react/useEffect)
- [Multer disk storage, filters and limits](https://expressjs.com/en/resources/middleware/multer/)
- [Existing html2pdf API](https://ekoopmans.github.io/html2pdf.js/)
