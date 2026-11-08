# Verification Record

Completed: **2026-11-08** (Asia/Ho_Chi_Minh). Owner: Tạ Gia Huy / CE182405.

## Executed checks

| Check | Actual result |
|---|---|
| Backend `npm.cmd test` | 361 tests: **354 passed, 0 failed, 7 skipped** |
| Backend architecture boundaries | All 19 pass, included in backend suite |
| Backend `npm.cmd run test:integration` | **53 passed, 0 failed, 0 skipped**, across seven isolated test files |
| Backend `npm.cmd run check` | Passed |
| Frontend `npm.cmd test` | **37 passed, 0 failed, 0 skipped** |
| Frontend `npm.cmd run lint` | Passed, no diagnostics on final run |
| Frontend `npm.cmd run build` | Passed; existing large-chunk warning remains, including html2pdf |
| Real Chrome headless smoke | Teacher/Student UI login, separate Section name/description create, select-only Lesson form, prompt upload, file-only resubmission, grade/feedback save, success/error toast, unified Gradebook and PDF download passed; zero runtime exceptions |
| Generated PDF visual inspection | Downloaded PDF opened/rasterized; Vietnamese Course/student names, Lesson1/1, Assignment8/10 Passed and Requirements met visible; no averaged final score |
| Documentation structure | Ten UC specs each contain all18 required sections and correct author metadata |
| `git diff --check` | Passed |

The seven normal-suite skips are DB-conditional Auth, AuthQC, Iteration2, Iteration3Huy,
SectionMigration, UserReview and CourseCompletion suites. The isolated integration
command sets TEST_MONGODB_URI and exercises all seven files without skips. Other existing
integration tests also run inside the normal backend test script.

PowerShell blocks npm.ps1 on this machine; `npm.cmd` ran the same package scripts.
No execution policy was changed. Earlier failing RED tests and review findings were
fixed; no assertions were removed or tests disabled to obtain this result.
Tests for the retired weighted-grade feature were replaced with shared-completion
regressions because the owner explicitly removed that feature; they were not skipped.

## Coverage relevant to this change

- Teacher ownership, invalid input, wrong/deleted Section and Course relationships.
- Section-scoped lesson sorting/reorder, duplicate IDs and legacy default assignment.
- Migration dry-run has no writes; repeat apply does not duplicate default Section;
  ID/order/video preservation, orphan reporting and guarded rollback.
- Deadline offset normalization and equality rejection; old answer survives late retry.
- Numerical0 versus missing grade, scale boundaries, independent feedback.
- Simultaneous grading revision conflicts, scale locking, concurrent settings edits.
- Shared completion: latest accepted results, missing/zero distinction, video threshold, unpublished/deleted activity exclusion, legacy pass and missing numeric threshold.
- Both completion APIs and concurrent completion produce one certificate; missing assessments cannot be bypassed.
- Resubmission changes Student course/certificate views and Gradebook consistently; old certificate history stays stored.
- Gradebook/report use the same rows; foreign Teacher and Student requests are denied.
- Video spoofing, foreign ownership, protected viewing, metadata, abandoned upload cleanup,
  failed unlink retry, metadata-write failure/null and registry-insert orphan recovery path.
- Real PDF/DOCX HTTP uploads and basic DOC/OOXML storage validation, spoof/oversize rejection, private downloads and post-deadline file retry.
- Separate Section description persists; success and failed-save toasts appear in real Chrome.
- Mutation experiment removed the all-requirements guard: regression suite failed as expected; exact original policy restored afterward.

## Reproduce

From repository root, after dependencies are available:

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix backend run test:integration
npm.cmd --prefix backend run check
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run test:browser:iteration3
git diff --check
```

Browser smoke needs Chrome at the script default Windows path or TEST_CHROME_PATH.
It uses a fresh browser profile, generated test credentials, isolated memory MongoDB,
ephemeral API/Vite ports, and UI login; it does not read a real browser profile or
extract stored tokens. Headless Chrome needs `--no-sandbox` in this restricted test
environment; only the ephemeral local test app is opened. Initial attempts without
that flag timed out enabling the renderer; the final run succeeded.

Generated test-only artifacts (not application records):

- `outputs/iteration3-huy/gradebook.png`
- `outputs/iteration3-huy/gradebook-mobile.png`
- `outputs/iteration3-huy/assignment-grading.png`
- `outputs/iteration3-huy/assignment-not-passed.png`
- `outputs/iteration3-huy/student-submission.png`
- `outputs/iteration3-huy/course-assignments.png`
- `outputs/iteration3-huy/course-quizzes.png`
- `outputs/iteration3-huy/quiz-workspace-empty.png`
- `outputs/iteration3-huy/quiz-workspace.png`
- `outputs/iteration3-huy/quiz-workspace-mobile.png`
- `outputs/iteration3-huy/quiz-question-mobile.png`
- `outputs/iteration3-huy/grade-report-preview.png`
- `outputs/iteration3-huy/grade-report-<test-course-id>.pdf`

## Limits and review outcomes

- No production database, application-data migration or deployment was performed.
  The owner subsequently authorized feature commits and push to HuyTGCE182405;
  see [DELIVERY.md](DELIVERY.md) for that delivery scope.
- Migration is demonstrated on an isolated database; existing application data was not backfilled.
- Official RDS/BR registry is unavailable; Generate Grade Report ID remains Proposed UC-19.4.
- Assessment scale/pass thresholds remain explicit; configure numeric Assignment passing score before grading. Weighted final policies were removed by owner request; existing values are ignored.
- PDF checked with a small Vietnamese roster; wide tables/large rosters still need owner review.
- Student progress, Gradebook/report and certificate eligibility now share the same evaluation. Current eligibility gates certificate visibility; no historical certificate records were deleted.
- Registry/storage compensation retries rely on eventual DB/disk availability; unused files may remain until retries/sweeps succeed. Soft-deleted Assignment prompt references are intentionally retained.
- Reports are live reads; official consistent exports need a grading pause or a future snapshot workflow.

Review covered correctness, boundaries, security, data integrity and simplification.
Concrete findings were addressed with scale CAS, rounding regression checks, upload
retry preservation/orphan sweep, explicit General Section selection, migration
integrity reporting, shared certificate gate, current student result visibility,
protected document flows, route-keyed workspaces and save notifications.

Current requirements and manual steps: [COMPLETION_UPDATE.md](COMPLETION_UPDATE.md).
Four supplied screenshot paths were unavailable; observed UI artifacts above show the implemented screens.

Status/navigation follow-up: four mapping regressions verify legacy failure labels,
neutral ungraded states and existing filter query values. Real Chrome verifies
Saved Passed green / Not passed red, unchanged saved status while editing, failing
filter/reload, Student/Gradebook parity and the prominent header Gradebook button.
Backend was not changed or redundantly retested for this display-only follow-up;
the backend/integration results above remain the previously executed gates.

English/clarity follow-up: the browser regression first failed on the missing
assignment list, then passed after implementation. Real Chrome verifies per-row
submission navigation, card overflow at320/768/1024/1440px, English submission
actions, focused persistent confirmation after toast dismissal, toast above the
modal, and deadline rejection without success or a changed submission revision.
The existing course-activity source-location assertion was replaced with rendered
two-assignment edit/submission links and empty-state checks. Temporarily inverting
the new list condition makes this regression fail; the condition was restored.
Frontend36 tests, lint/build and the full isolated Chrome smoke pass. No backend
code or application data was changed in this follow-up. Read-only review found no
concrete blocker; existing modal focus-trap/Escape behavior remains outside scope.

SSR test servers disable WebSockets to avoid parallel port conflicts, following
[Vite server.ws documentation](https://vite.dev/config/server-options#server-ws)
and the installed Vite implementation. This changes only the test server.

Cancel Editing regression: Chrome first reproduced the failure (edit state cleared
while remaining on the editor URL). After the fix, both the assignment edit route
and legacy query-ID entry return to the correct Course edit#activities URL and
render the assignment list. Unsaved title and selected prompt file are not persisted.
The full Chrome smoke, frontend36 tests, lint/build and diff checks pass; no backend
change was required. Self-review includes the successful-delete caller, which also
returns to Course Activities when deleting the assignment currently being edited.

Submissions Back regression: Chrome reproduced the missing control, then verifies
the new visible link's owning-Course URL, clicks it and confirms the Activities
assignment list loads. It reopens submissions and completes the existing grading,
Gradebook and PDF smoke with zero runtime exceptions. Frontend36 tests, lint/build
and diff checks pass. Back uses the authorized loaded assignment.courseId and an
explicit application route, so direct entry does not depend on browser history.

Quiz card consistency: added a rendered-component regression for two named Quiz
edit links, scoped creation and the empty state; it fails before the new component
exists and passes after implementation. Real Chrome checks both assessment cards
at320/768/1024/1440px, including a long Quiz title, clicks the intended Quiz URL
without assuming list order, and verifies its workspace title. The full existing
grading/Gradebook/PDF smoke also passes with zero runtime exceptions. Final frontend
37 tests, lint/build and diff checks pass. Self-review confirms shared card CSS,
accessible named actions, existing routes and no backend/business logic changes.

Inner Quiz workspace: Chrome reproduced mismatched panel widths before the fix.
It now verifies configuration/questions alignment at320/390/768/1024/1440px,
neutral save-button color, configuration persistence, question create/edit, and
question/bank dialog overflow. Visual review found Ask AI overlapping the save
action and dialog; a second RED regression reproduces the overlap. Left-aligned
save actions and Quiz overlay1200 (chat1100, toast10000) make it pass. Full Chrome
grading/Gradebook/PDF smoke finishes with zero runtime exceptions. Final frontend
37 tests, lint/build and diff checks pass. Read-only review found no blocker;
layout selectors are Quiz-scoped and handlers/API behavior remain intact.
Mobile checks cover Quiz containers/dialogs; the shared application shell retains
its existing narrow-screen behavior. Modal focus trapping/Escape and bank checkbox
labels predate this change and remain outside this layout scope.
