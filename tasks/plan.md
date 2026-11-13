# Iteration 3 — HuyTGCE182405

## PR 17 conflict resolution (2026-11-13)
Merge origin/main into HuyTGCE182405 without rewriting branch history. Both
branches retired teacher applications: retain main's removal of dashboard fields
and the branch's teacher-management navigation, icons and UI updates. Preserve
current dashboard controller coverage. First reproduce main's dashboard contract
test against this branch, then resolve backend and frontend conflicts. Run the
focused tests, full backend/frontend suites, lint and build; inspect the final
merge diff and push only HuyTGCE182405. Completion requires a clean working tree,
main as an ancestor and PR 17 reported mergeable. Do not merge the PR into main.

Verification: main's dashboard service test failed against the original branch
and passed after adopting main's dashboard contract. All 13 focused backend
tests passed, including real HTTP checks for retired endpoints. Full checks:
351 backend tests passed, 7 skipped; 41 frontend tests passed; lint clean; build
passed with the existing large-chunk warning. Backend dependencies were synced
to google-auth-library 11.3.3 and nodemailer 10.4.0 before the final backend run;
the committed lockfile remains identical to main. Reviewed the conflict-only
diff and auto-merged student progress changes; no conflict markers remain.

## Authorized Git delivery (2026-11-08)
Owner requests all completed work pushed to HuyTGCE182405 in function-scoped commits
named HuyTGCE182405_FunctionName_add/update/delete. Preserve existing branch history,
exclude secrets/generated outputs, record the nine requested functions and related
follow-ups, rerun required checks, compare the final committed tree to the verified
working snapshot, and push only this branch without force or deployment.

## Quiz workspace alignment (2026-11-08)
Match Assignment's centered900px assessment workspace. Context, configuration and
questions must share edges/width, use neutral assessment controls, consistent gaps,
and stack numeric inputs/actions on narrow screens. Remove conflicting inline form
layout and misleading related-lesson helper. Verify empty/populated questions,
create/edit and bank modal layouts while preserving handlers/API behavior. Start
with a failing browser width assertion, then save/navigation/modal checks, frontend
tests/lint/build, screenshots and review.

## Course Quizzes visual consistency (2026-11-08)
Match the Course Assignments card: neutral surface, heading/helper, one titled row
per Quiz, explicit Edit quiz action, and separate Create quiz footer. Reuse shared
assessment card/list styles for consistent spacing and responsive controls. Keep
existing quiz routes and business logic. Verify rendered populated/empty links and
real Chrome navigation/layout, then frontend tests/lint/build and self-review.

## Submission Back navigation (2026-11-08)
Add a visible English Back to Course Activities control above the submissions
heading, targeting the assignment's owning Course edit#activities URL. Keep the
Gradebook action distinct. Verify direct URL entry and actual Back navigation in
Chrome before/after the fix, followed by frontend checks and self-review.

## Cancel Assignment editing regression (2026-11-08)
Cancel Editing must discard unsaved local edits and return to the selected Course
Activities tab, rather than clear editingId and display a creation form on the edit
URL. Preserve all saved instructions/files/settings. Reproduce in Chrome before
the fix, verify route and query-ID entry paths, then frontend tests/lint/build and
self-review. No API or data model change.

## English UI and assignment clarity follow-up (2026-11-08)
Use English for system labels, controls and notifications in the changed features;
preserve teacher/student content. Show submission success above modal overlays and
persist an accessible confirmation inside the submission dialog. A failed request
must not display success or replace the saved submission. Simplify the Teacher
assignment card into named rows with explicit edit/submission actions, keeping
Gradebook and creation actions separate. Verify these outcomes first with failing
real-browser assertions, then full frontend tests/lint/build and review.

## Assessment status UI follow-up (2026-11-08)
Owner requests clear Passed (green) / Not passed (red), no needs-revision labels.
Map legacy API status to human labels without changing stored grades or completion.
Use one display mapping for list/filter, saved submission detail, Student and Gradebook;
ungraded/missing-threshold states stay neutral. Saved status changes only after a
successful save, not while editing an unsaved score. Verify mapping unit tests,
real-browser fail/pass saves and filter, frontend full tests/lint/build; self-review.

> 2026-11-08 follow-up: weighted final-grade decisions below are superseded by
> [course-completion-spec.md](course-completion-spec.md). User authorized a shared
> Lesson/video + latest Quiz + current Assignment completion result and certificate
> gate, removal of weighted grading UI/results, neutral UI and save notifications.

Owner: Tạ Gia Huy (CE182405). Started: 2026-11-07.

## Verified baseline
Repository ports/adapters; no DAO or Section. Lesson references Course directly.
Teacher lesson creation: TeacherCourseFormPage -> teacherService -> teacherRoutes ->
TeacherCourseController/LessonDTO -> CourseService -> LessonRepository -> Lesson.
Assignment submission: CourseLearnPage -> studentService -> StudentAssignmentController
-> AssignmentService -> AssignmentSubmissionRepository -> AssignmentSubmission.
No gradebook. QuizAttempt contains numeric scores; assignment grading is pass/revision.
Working tree was clean before this task. No commit, push, deployment, or production migration.

## Decisions and compatibility
- Add Section; retain Lesson.courseId and validate consistency at service boundaries.
- Expand schema with nullable sectionId for legacy records; new writes resolve an active
  section (default section for old callers). Backfill only with explicit local/test CLI.
- Section order is within course; lesson order within section. Legacy flat reads remain
  available, ordered by section then lesson; include section metadata for UI and AI.
- Reuse assignment update and grading endpoints. One submission remains the source of
  assignment grades. No independent override of quiz grades or fabricated submission.
- Numeric grading requires explicitly configured maxScore; final grade requires an
  explicit course policy. Never infer final weights from completion progress weights.
- Owner confirmed: reject at deadline equality, immediately visible saved results, PDF.
- Owner confirmed explicit grade configuration; no inferred weights/pass threshold.

## Ordered slices and acceptance
1. Section creation/list + editor integration; reject foreign/deleted sections and owners.
2. Lesson/reorder/read integration; preserve IDs and legacy callers; section-scoped order.
3. Idempotent migration, dry-run, isolated Mongo tests, rollback journal.
4. Assignment deadlines/scales + editor; exact time boundary and existing records preserved.
5. Submission list/detail + grading/feedback UI; bounded pagination, owner isolation,
   score zero distinct from null, one authoritative source, stale-write protection.
6. Gradebook read + manual entry through submission; explicit policy calculation;
   report uses identical service output and existing PDF support.
7. Video attachment ownership + metadata and abandoned upload cleanup.
8. Ten UC specifications, migration guide, architecture update, review and full gates.

Each slice starts with focused failing tests, then implementation and verification.
Final gates: backend architecture/test/isolated integration, frontend test/lint/build,
git diff --check. Runtime browser verification if browser tooling is available.

## Official implementation sources
- https://mongoosejs.com/docs/8.x/docs/tutorials/findoneandupdate.html
- https://mongoosejs.com/docs/8.x/docs/validation.html
- https://react.dev/reference/react/useEffect
- https://expressjs.com/en/resources/middleware/multer/
- https://ekoopmans.github.io/html2pdf.js/

## Risks/open decisions
Per-Course scales/policies must be configured; supported rounding/provisional behavior
and Proposed UC-19.4 still need specification review. Legacy consumers remain valid
during expand/backfill; the isolated migration and Chrome checks are documented in
docs/use-cases/iteration-3-huy/VERIFICATION.md. Completed 2026-11-08.
No Section delete/full CRUD is included. No change to certificate policy is implied.


## Follow-up completion record (2026-11-08)
The owner-authorized follow-up is implemented and verified. Current requirements,
source mapping, limits and manual acceptance steps are in
`docs/use-cases/iteration-3-huy/COMPLETION_UPDATE.md`; actual checks are in VERIFICATION.md.
Backend361 tests (354pass,7DB-conditional skips); isolated integration53pass/0skip;
frontend32pass; architecture19pass; syntax/lint/build and real Chrome/PDF checks pass.
Weighted final-grade implementation was removed, separate Section form/file uploads
added, both certificate paths gated, Student views reconciled, save toasts verified.
No commit/push/deploy or application data migration. Original screenshot references
remain unavailable; current UI artifacts are in outputs/iteration3-huy.
