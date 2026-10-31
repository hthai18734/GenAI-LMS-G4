import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';

function lazyPage(name, loader) {
  const Page = lazy(loader);
  Page.displayName = name;
  return Page;
}

const LandingPage = lazyPage('LandingPage', () => import('../pages/LandingPage'));
const LoginPage = lazyPage('LoginPage', () => import('../pages/LoginPage'));
const RegisterPage = lazyPage('RegisterPage', () => import('../pages/RegisterPage'));
const OtpPage = lazyPage('OtpPage', () => import('../pages/OtpPage'));
const OAuthCallbackPage = lazyPage('OAuthCallbackPage', () => import('../pages/OAuthCallbackPage'));
const DashboardPage = lazyPage('DashboardPage', () => import('../pages/DashboardPage'));
const CoursesPage = lazyPage('CoursesPage', () => import('../pages/CoursesPage'));
const CourseLearnPage = lazyPage('CourseLearnPage', () => import('../pages/CourseLearnPage'));
const LearningHistoryPage = lazyPage('LearningHistoryPage', () => import('../pages/LearningHistoryPage'));
const CertificatesPage = lazyPage('CertificatesPage', () => import('../pages/CertificatesPage'));
const ProfilePage = lazyPage('ProfilePage', () => import('../pages/ProfilePage'));
const SettingsPage = lazyPage('SettingsPage', () => import('../pages/SettingsPage'));
const TeacherCoursesPage = lazyPage('TeacherCoursesPage', () => import('../pages/TeacherCoursesPage'));
const TeacherCourseFormPage = lazyPage('TeacherCourseFormPage', () => import('../pages/TeacherCourseFormPage'));
const TeacherDashboardPage = lazyPage('TeacherDashboardPage', () => import('../pages/TeacherDashboardPage'));
const TeacherQuizFormPage = lazyPage('TeacherQuizFormPage', () => import('../pages/TeacherQuizFormPage'));
const TeacherQuizWorkspacePage = lazyPage('TeacherQuizWorkspacePage', () => import('../pages/TeacherQuizWorkspacePage'));
const TeacherAssignmentFormPage = lazyPage('TeacherAssignmentFormPage', () => import('../pages/TeacherAssignmentFormPage'));
const TeacherAIContentPage = lazyPage('TeacherAIContentPage', () => import('../pages/TeacherAIContentPage'));
const AdminModerationPage = lazyPage('AdminModerationPage', () => import('../pages/AdminModerationPage'));
const CategoriesPage = lazyPage('CategoriesPage', () => import('../pages/CategoriesPage'));
const PublicCoursesPage = lazyPage('PublicCoursesPage', () => import('../pages/PublicCoursesPage'));
const PublicCourseDetailPage = lazyPage('PublicCourseDetailPage', () => import('../pages/PublicCourseDetailPage'));
const TeacherProfilePage = lazyPage('TeacherProfilePage', () => import('../pages/TeacherProfilePage'));
const AdminTeacherApplicationsPage = lazyPage('AdminTeacherApplicationsPage', () => import('../pages/AdminTeacherApplicationsPage'));
const AdminDashboardPage = lazyPage('AdminDashboardPage', () => import('../pages/AdminDashboardPage'));
const TeacherApplicationPage = lazyPage('TeacherApplicationPage', () => import('../pages/TeacherApplicationPage'));
const TeacherQuestionBankPage = lazyPage('TeacherQuestionBankPage', () => import('../pages/TeacherQuestionBankPage'));
const TeacherContentReportsPage = lazyPage('TeacherContentReportsPage', () => import('../pages/TeacherContentReportsPage'));
const StudentQuizStartPage = lazyPage('StudentQuizStartPage', () => import('../pages/StudentQuizStartPage'));
const StudentQuizAttemptPage = lazyPage('StudentQuizAttemptPage', () => import('../pages/StudentQuizAttemptPage'));
const StudentQuizResultPage = lazyPage('StudentQuizResultPage', () => import('../pages/StudentQuizResultPage'));
const StudentContentReportsPage = lazyPage('StudentContentReportsPage', () => import('../pages/StudentContentReportsPage'));
const LearningGoalsPage = lazyPage('LearningGoalsPage', () => import('../pages/LearningGoalsPage'));
const WishlistPage = lazyPage('WishlistPage', () => import('../pages/WishlistPage'));
const ReviewsPage = lazyPage('ReviewsPage', () => import('../pages/ReviewsPage'));
const NotificationsPage = lazyPage('NotificationsPage', () => import('../pages/NotificationsPage'));
const ChangePasswordPage = lazyPage('ChangePasswordPage', () => import('../pages/ChangePasswordPage'));
const RequestPasswordResetPage = lazyPage('RequestPasswordResetPage', () => import('../pages/RequestPasswordResetPage'));
const ResetPasswordPage = lazyPage('ResetPasswordPage', () => import('../pages/ResetPasswordPage'));
const AdminAccountsPage = lazyPage('AdminAccountsPage', () => import('../pages/AdminAccountsPage'));
const AdminUserFormPage = lazyPage('AdminUserFormPage', () => import('../pages/AdminUserFormPage'));
const AdminUserDetailPage = lazyPage('AdminUserDetailPage', () => import('../pages/AdminUserDetailPage'));
const AdminTeachersPage = lazyPage('AdminTeachersPage', () => import('../pages/AdminTeachersPage'));
const AdminVouchersPage = lazyPage('AdminVouchersPage', () => import('../pages/AdminVouchersPage'));
const NotFoundPage = lazyPage('NotFoundPage', () => import('../pages/NotFoundPage'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="page-loading" role="status">Loading...</div>}>
    <Routes>
      {/* Public Landing & Auth Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/explore" element={<PublicCoursesPage />} />
      <Route path="/courses/:courseId" element={<PublicCourseDetailPage />} />
      <Route path="/teachers/:teacherId" element={<TeacherProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<OtpPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Protected Student Portal Routes */}
      <Route
        element={
          <ProtectedRoute roles={['student']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId/learn" element={<CourseLearnPage />} />
        <Route path="/history" element={<LearningHistoryPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
        <Route path="/learning-goals" element={<LearningGoalsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/my-reports" element={<StudentContentReportsPage />} />
        <Route path="/quizzes/:quizId/start" element={<StudentQuizStartPage />} />
        <Route path="/quiz-attempts/:attemptId" element={<StudentQuizAttemptPage />} />
        <Route path="/quiz-attempts/:attemptId/result" element={<StudentQuizResultPage />} />
        <Route path="/apply-teacher" element={<TeacherApplicationPage />} />
        <Route path="/account" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route element={<ProtectedRoute roles={['teacher']}><Layout /></ProtectedRoute>}>
        <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
        <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
        <Route path="/teacher/courses/new" element={<TeacherCourseFormPage />} />
        <Route path="/teacher/courses/:courseId/edit" element={<TeacherCourseFormPage />} />
        <Route path="/teacher/courses/:courseId/preview" element={<CourseLearnPage />} />
        <Route path="/teacher/quizzes/new" element={<TeacherQuizFormPage />} />
        <Route path="/teacher/quizzes/:quizId" element={<TeacherQuizWorkspacePage />} />
        <Route path="/teacher/assignments/new" element={<TeacherAssignmentFormPage />} />
        <Route path="/teacher/assignments/:assignmentId/edit" element={<TeacherAssignmentFormPage />} />
        <Route path="/teacher/ai-content" element={<TeacherAIContentPage />} />
        <Route path="/teacher/questions" element={<TeacherQuestionBankPage />} />
        <Route path="/teacher/reviews" element={<ReviewsPage />} />
        <Route path="/teacher/reports" element={<TeacherContentReportsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/teacher-applications" element={<AdminTeacherApplicationsPage />} />
        <Route path="/admin/moderation" element={<AdminModerationPage />} />
        <Route path="/admin/categories" element={<CategoriesPage />} />
        <Route path="/admin/users" element={<AdminAccountsPage />} />
        <Route path="/admin/users/new" element={<AdminUserFormPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
        <Route path="/admin/users/:userId/edit" element={<AdminUserFormPage />} />
        <Route path="/admin/teachers" element={<AdminTeachersPage />} />
        <Route path="/admin/reviews" element={<ReviewsPage />} />
        <Route path="/admin/vouchers" element={<AdminVouchersPage />} />
        <Route path="/admin/vouchers/new" element={<AdminVouchersPage mode="new" />} />
        <Route path="/admin/vouchers/:id" element={<AdminVouchersPage mode="detail" />} />
        <Route path="/admin/vouchers/:id/edit" element={<AdminVouchersPage mode="edit" />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
