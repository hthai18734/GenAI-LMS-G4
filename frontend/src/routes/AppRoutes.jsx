import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';

import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import OtpPage from '../pages/OtpPage';
import OAuthCallbackPage from '../pages/OAuthCallbackPage';
import DashboardPage from '../pages/DashboardPage';
import CoursesPage from '../pages/CoursesPage';
import CourseLearnPage from '../pages/CourseLearnPage';
import LearningHistoryPage from '../pages/LearningHistoryPage';
import CertificatesPage from '../pages/CertificatesPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';
import TeacherCoursesPage from '../pages/TeacherCoursesPage';
import TeacherCourseFormPage from '../pages/TeacherCourseFormPage';
import TeacherDashboardPage from '../pages/TeacherDashboardPage';
import TeacherQuizFormPage from '../pages/TeacherQuizFormPage';
import TeacherQuizWorkspacePage from '../pages/TeacherQuizWorkspacePage';
import TeacherAssignmentFormPage from '../pages/TeacherAssignmentFormPage';
import TeacherAIContentPage from '../pages/TeacherAIContentPage';
import AdminModerationPage from '../pages/AdminModerationPage';
import CategoriesPage from '../pages/CategoriesPage';
import PublicCoursesPage from '../pages/PublicCoursesPage';
import PublicCourseDetailPage from '../pages/PublicCourseDetailPage';
import TeacherProfilePage from '../pages/TeacherProfilePage';
import AdminTeacherApplicationsPage from '../pages/AdminTeacherApplicationsPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import TeacherApplicationPage from '../pages/TeacherApplicationPage';
import TeacherQuestionBankPage from '../pages/TeacherQuestionBankPage';
import TeacherContentReportsPage from '../pages/TeacherContentReportsPage';
import StudentQuizStartPage from '../pages/StudentQuizStartPage';
import StudentQuizAttemptPage from '../pages/StudentQuizAttemptPage';
import StudentQuizResultPage from '../pages/StudentQuizResultPage';
import StudentContentReportsPage from '../pages/StudentContentReportsPage';
import LearningGoalsPage from '../pages/LearningGoalsPage';
import WishlistPage from '../pages/WishlistPage';
import ReviewsPage from '../pages/ReviewsPage';
import NotificationsPage from '../pages/NotificationsPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import RequestPasswordResetPage from '../pages/RequestPasswordResetPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import AdminAccountsPage from '../pages/AdminAccountsPage';
import AdminUserFormPage from '../pages/AdminUserFormPage';
import AdminUserDetailPage from '../pages/AdminUserDetailPage';
import AdminTeachersPage from '../pages/AdminTeachersPage';
import AdminVouchersPage from '../pages/AdminVouchersPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
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
  );
}
