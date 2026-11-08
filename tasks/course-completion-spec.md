# Unified course completion — 2026-11-08

Approved scope: the user's current request supersedes weighted final-grade rules.

## Objective and acceptance
- One live completion result: every published, accessible Lesson (video >=90% when present), every published Quiz passed on its latest submitted attempt, and every Assignment passed on its current submission.
- Assignment and Quiz deadlines continue to be enforced on submission. Already accepted records are not invalidated by a subsequent deadline edit. No highest-attempt selection or weighted average remains in Gradebook/report.
- Gradebook and student progress use the same evaluator. Missing scores are not zero. Numeric Assignment grades without a passing threshold cannot establish a pass; legacy explicit pass/revision remains supported.
- Both automatic lesson-triggered completion and explicit course completion use the same certificate gate. A completed enrollment cannot bypass eligibility checks. Existing certificate records are not deleted by this change.
- Gradebook/report show Lesson counts, latest assessment scores/status, completion readiness and remaining requirements. Retire weighted-policy writes with an authorized 410 response; ignore existing stored gradePolicy without migrating data.
- Simple white/neutral panels, clear labels, compact tables and responsive forms. Add success/error toast for assessment saves and other touched save flows, with disabled pending actions and persistent inline errors.

## Structure and implementation order
1. Completion domain policy + shared ProgressTrackingService read evaluation; test latest attempts, missing grades, video and unpublished content.
2. Certificate gate reused by StudentLearningService; test both paths, repeated completion and failed requirements.
3. Gradebook/report from the shared result; tests for source parity, ownership and retired policy.
4. Teacher UI/report, toast and isolated real-browser smoke; screenshots of desktop/mobile.
5. Update affected UC/architecture docs and run review/full gates.

## Additional authorized scope
- Separate `/teacher/courses/:courseId/sections/new` form with name (1–200) and optional description (<=5000); Lesson editor selects only. Keep stored Section.title and accept legacy title payloads for compatibility.
- Teacher attaches one PDF/DOC/DOCX prompt while creating/editing Assignment. Student submits text and/or one PDF/DOC/DOCX, maximum 25 MiB; existing text-only callers retained.
- Multipart acceptance checks course ownership/enrollment/deadline before receiving bytes and again at service write. File signatures/container metadata checked, randomized private storage, authenticated downloads; no public static document route.
- Teacher can preview PDF/download Word submitted by their students and grade through the existing assessment flow. Replacement clears prior grade/feedback, uses submission revision when supplied, and cleans unused files; abandoned storage is retried by scheduled sweep after 24h.

## Commands and stack
Existing CommonJS Node/Express/Mongoose8 backend and React19/Vite frontend; no new dependencies.
Focused: `node --test tests/service/CourseCompletion.test.js tests/service/GradebookService.test.js` from backend.
Gates: `npm.cmd --prefix backend test`, `npm.cmd --prefix backend run test:integration`, `npm.cmd --prefix backend run check`, `npm.cmd --prefix frontend test`, `npm.cmd --prefix frontend run lint`, `npm.cmd --prefix frontend run build`, `npm.cmd --prefix frontend run test:browser:iteration3`, `git diff --check`.
Use dependency injection, existing response/error contracts, AbortController effect cleanup and textContent PDF rendering. Never commit/push/deploy, expose secrets or change application data. Preserve prior uncommitted work.

## Sources and limits
- https://mongoosejs.com/docs/8.x/docs/tutorials/findoneandupdate.html
- https://react.dev/reference/react/useEffect
- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- Four referenced screenshot paths are unavailable; user was asked to reattach. Apply the requested restrained design to the known Gradebook/submission/assessment controls pending screenshots.
