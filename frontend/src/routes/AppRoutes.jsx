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
import AdminModerationPage from '../pages/AdminModerationPage';
import CategoriesPage from '../pages/CategoriesPage';
import PublicCoursesPage from '../pages/PublicCoursesPage';
import PublicCourseDetailPage from '../pages/PublicCourseDetailPage';
import TeacherProfilePage from '../pages/TeacherProfilePage';
import AdminTeacherApplicationsPage from '../pages/AdminTeacherApplicationsPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import TeacherApplicationPage from '../pages/TeacherApplicationPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/explore" element={<PublicCoursesPage />} />
      <Route path="/courses/:courseId" element={<PublicCourseDetailPage />} />
      <Route path="/teachers/:teacherId" element={<TeacherProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<OtpPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

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
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/apply-teacher" element={<TeacherApplicationPage />} />
        <Route path="/account" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={['teacher']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
        <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
        <Route path="/teacher/courses/new" element={<TeacherCourseFormPage />} />
        <Route path="/teacher/courses/:courseId/edit" element={<TeacherCourseFormPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/teacher-applications" element={<AdminTeacherApplicationsPage />} />
        <Route path="/admin/moderation" element={<AdminModerationPage />} />
        <Route path="/admin/categories" element={<CategoriesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
