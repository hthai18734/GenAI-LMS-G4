import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';
import TeacherSuspendedNotice from './TeacherSuspendedNotice';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  if (user?.status !== 'active') return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={user?.role === 'teacher' ? '/teacher/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  if (roles?.includes('teacher') && user?.role === 'teacher' && user.teachingStatus === 'suspended') {
    return <TeacherSuspendedNotice />;
  }
  return children;
}
