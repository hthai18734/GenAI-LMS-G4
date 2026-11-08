# Implementation File Manifest

Assessment status follow-up additionally adds:

- `frontend/src/shared/assessment/status.js`
- `frontend/src/shared/assessment/AssessmentStatus.jsx`
- `frontend/src/shared/assessment/status.test.js`

Iteration3 / HuyTGCE182405. Updated2026-11-08 after unified completion and file-upload follow-up.
The owner authorized feature commits and push to HuyTGCE182405 on2026-11-08.
Deployment and application-data migration remain outside scope. Test outputs/logs
are excluded. See [DELIVERY.md](DELIVERY.md) for the commit grouping and validation.

## Backend code, configuration and scripts

- `backend/package.json`
- `backend/scripts/migrate-sections.js`
- `backend/scripts/run-isolated-integration-tests.js`
- `backend/src/application/ports/outbound/RepositoryPorts.js`
- `backend/src/composition/bootstrap.js`
- `backend/src/composition/repositories.js`
- `backend/src/composition/services.js`
- `backend/src/controller/common/AssignmentUploadInput.js`
- `backend/src/controller/learning/AssignmentDocumentController.js`
- `backend/src/controller/learning/LessonManagementController.js`
- `backend/src/controller/learning/LessonVideoController.js`
- `backend/src/controller/student/StudentAssignmentController.js`
- `backend/src/controller/teacher/TeacherAssignmentController.js`
- `backend/src/controller/teacher/TeacherCourseController.js`
- `backend/src/controller/teacher/TeacherGradebookController.js`
- `backend/src/controller/teacher/TeacherSectionController.js`
- `backend/src/domain/learning/CourseCompletionPolicy.js`
- `backend/src/dto/assignment/AssignmentSettingsDTO.js`
- `backend/src/dto/assignment/CreateAssignmentDTO.js`
- `backend/src/dto/assignment/SubmissionDTO.js`
- `backend/src/dto/assignment/UpdateAssignmentDTO.js`
- `backend/src/dto/course/CreateSectionDTO.js`
- `backend/src/dto/course/LessonDTO.js`
- `backend/src/filter/ErrorFilter.js`
- `backend/src/infrastructure/persistence/mongoose/migrations/sectionLessons.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/chat/ChatLearningRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/AssignmentDocumentRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/AssignmentRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/AssignmentSubmissionRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/CertificateRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/CourseCleanupRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/GradebookRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/SectionRepository.js`
- `backend/src/infrastructure/persistence/mongoose/repositories/learning/VideoUploadRepository.js`
- `backend/src/infrastructure/storage/AssignmentDocumentStorageGateway.js`
- `backend/src/infrastructure/storage/LocalFileStorageGateway.js`
- `backend/src/model/learning/Assignment.js`
- `backend/src/model/learning/AssignmentFileSchema.js`
- `backend/src/model/learning/AssignmentSubmission.js`
- `backend/src/model/learning/Course.js`
- `backend/src/model/learning/Lesson.js`
- `backend/src/model/learning/Section.js`
- `backend/src/model/learning/VideoUpload.js`
- `backend/src/routes/studentRoutes.js`
- `backend/src/routes/teacherRoutes.js`
- `backend/src/service/learning/AssignmentAssessmentService.js`
- `backend/src/service/learning/AssignmentDocumentService.js`
- `backend/src/service/learning/AssignmentService.js`
- `backend/src/service/learning/CourseService.js`
- `backend/src/service/learning/EnrollmentLifecycleService.js`
- `backend/src/service/learning/GradebookService.js`
- `backend/src/service/learning/LessonManagementService.js`
- `backend/src/service/learning/LessonVideoService.js`
- `backend/src/service/learning/ProgressTrackingService.js`
- `backend/src/service/learning/QuizService.js`
- `backend/src/service/learning/SectionService.js`
- `backend/src/service/student/StudentLearningService.js`
- `backend/src/utils/upload/AssignmentDocumentUpload.js`
- `backend/src/utils/upload/LessonVideoUpload.js`

## Backend tests

- `backend/tests/controller/CourseCompletion.integration.test.js`
- `backend/tests/controller/Iteration3Huy.integration.test.js`
- `backend/tests/controller/SectionMigration.integration.test.js`
- `backend/tests/controller/StudentController.test.js`
- `backend/tests/fixtures/assignmentDocx.js`
- `backend/tests/service/AssignmentAssessment.test.js`
- `backend/tests/service/AssignmentDeadline.test.js`
- `backend/tests/service/AssignmentDocuments.test.js`
- `backend/tests/service/CourseCompletion.test.js`
- `backend/tests/service/EnrollmentLifecycleService.test.js`
- `backend/tests/service/GradebookService.test.js`
- `backend/tests/service/LessonManagementService.test.js`
- `backend/tests/service/QuizDeadline.test.js`
- `backend/tests/service/SectionLessons.test.js`
- `backend/tests/service/SectionService.test.js`
- `backend/tests/service/StudentLessonVisibility.test.js`
- `backend/tests/service/VideoUpload.test.js`

## Frontend code and browser tests

- `frontend/package.json`
- `frontend/scripts/iteration3-browser-smoke.cjs`
- `frontend/src/components/Layout.jsx`
- `frontend/src/features/learning/AssignmentAttachment.jsx`
- `frontend/src/features/student/api.js`
- `frontend/src/features/teacher/CourseSections.jsx`
- `frontend/src/features/teacher/api.js`
- `frontend/src/features/teacher/assignmentModel.js`
- `frontend/src/features/teacher/gradeReport.js`
- `frontend/src/features/teacher/gradeReport.test.js`
- `frontend/src/features/teacher/models.test.js`
- `frontend/src/index.css`
- `frontend/src/pages/CourseLearnPage.jsx`
- `frontend/src/pages/TeacherAssignmentFormPage.jsx`
- `frontend/src/pages/TeacherAssignmentFormPage.test.js`
- `frontend/src/pages/TeacherAssignmentSubmissionsPage.jsx`
- `frontend/src/pages/TeacherCourseFormPage.jsx`
- `frontend/src/pages/TeacherGradebookPage.jsx`
- `frontend/src/pages/TeacherSectionCreatePage.jsx`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/shared/assignment/documents.js`
- `frontend/src/shared/assignment/documents.test.js`

## Architecture, UC documentation and task records

- `docs/ARCHITECTURE.md`
- `docs/use-cases/iteration-3-huy/CHANGES.md`
- `docs/use-cases/iteration-3-huy/COMPLETION_UPDATE.md`
- `docs/use-cases/iteration-3-huy/README.md`
- `docs/use-cases/iteration-3-huy/REVIEW_CHECKLIST.md`
- `docs/use-cases/iteration-3-huy/SECTION_MIGRATION.md`
- `docs/use-cases/iteration-3-huy/UC-15.1-create-section.md`
- `docs/use-cases/iteration-3-huy/UC-16.2-upload-video.md`
- `docs/use-cases/iteration-3-huy/UC-17.2-set-assignment-deadline.md`
- `docs/use-cases/iteration-3-huy/UC-17.3-view-assignment-submissions.md`
- `docs/use-cases/iteration-3-huy/UC-17.4-grade-assignment-submission.md`
- `docs/use-cases/iteration-3-huy/UC-17.5-give-assignment-feedback.md`
- `docs/use-cases/iteration-3-huy/UC-19.1-view-gradebook.md`
- `docs/use-cases/iteration-3-huy/UC-19.2-enter-student-grades.md`
- `docs/use-cases/iteration-3-huy/UC-19.3-calculate-final-grade.md`
- `docs/use-cases/iteration-3-huy/UC-19.4-generate-grade-report.md`
- `docs/use-cases/iteration-3-huy/VERIFICATION.md`
- `tasks/course-completion-spec.md`
- `tasks/plan.md`
- `tasks/todo.md`

## Repository configuration

English/clarity follow-up adds `frontend/src/features/teacher/CourseAssignments.jsx`
and updates `frontend/src/pages/TeacherQuizWorkspacePage.test.js` to verify rendered
per-assignment edit/submission links and the empty state. Existing CourseLearn,
TeacherCourseForm, CSS and browser smoke files include the associated English
copy, persistent submission confirmation, toast stacking and navigation checks.
Quiz consistency also adds `frontend/src/features/teacher/CourseQuizzes.jsx`; both
cards consume shared assessment-card/list CSS and existing resource routes.

- `.gitignore`
