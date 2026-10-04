import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return (
      <Navigate
        to={
          user?.role === 'teacher'
            ? '/teacher/dashboard'
            : user?.role === 'admin'
              ? '/admin/dashboard'
              : '/dashboard'
        }
        replace
      />
    );
  }
  return children;
}
