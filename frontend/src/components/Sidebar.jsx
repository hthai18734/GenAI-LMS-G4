import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';

const linkClass = ({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`;

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || 'student';

  if (role === 'teacher') {
    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>AI-LMS Teacher</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/teacher/dashboard" className={linkClass}>
            <span className="link-text">📊 Dashboard</span>
          </NavLink>
          <NavLink to="/teacher/courses" className={linkClass}>
            <span className="link-text">📚 My Courses</span>
          </NavLink>
          <NavLink to="/teacher/questions" className={linkClass}>
            <span className="link-text">📁 Question Bank</span>
          </NavLink>
          <NavLink to="/teacher/ai-content" className={linkClass}>
            <span className="link-text">AI Content Studio</span>
          </NavLink>
          <NavLink to="/teacher/reviews" className={linkClass}>
            <span className="link-text">⭐ Course Reviews</span>
          </NavLink>
          <NavLink to="/teacher/reports" className={linkClass}>
            <span className="link-text">⚠️ Content Reports</span>
          </NavLink>
        </nav>
      </aside>
    );
  }
  if (role === 'admin') {
    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>AI-LMS Admin</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin/dashboard" className={linkClass}>
            <span className="link-text">📊 Dashboard</span>
          </NavLink>
          <NavLink to="/admin/vouchers" className={linkClass}><span className="link-text">Voucher Management</span></NavLink>
          <NavLink to="/admin/users" className={linkClass}><span className="link-text">Account Management</span></NavLink>
          <NavLink to="/admin/reviews" className={linkClass}><span className="link-text">Review Management</span></NavLink>
          <NavLink to="/admin/teachers" className={linkClass}><span className="link-text">Teacher Management</span></NavLink>
          <NavLink to="/admin/moderation" className={linkClass}>
            <span className="link-text">🛡️ Course Moderation</span>
          </NavLink>
          <NavLink to="/admin/teacher-applications" className={linkClass}>
            <span className="link-text">👨‍🏫 Teacher Applications</span>
          </NavLink>
          <NavLink to="/admin/categories" className={linkClass}>
            <span className="link-text">🏷️ Category Management</span>
          </NavLink>
        </nav>
      </aside>
    );
  }
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>AI-LMS Student</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={linkClass}>
          <span className="link-text">🏠 Dashboard</span>
        </NavLink>
        <NavLink to="/courses" className={linkClass}>
          <span className="link-text">📚 Enrolled Courses</span>
        </NavLink>
        <NavLink to="/learning-goals" className={linkClass}>
          <span className="link-text">🎯 Learning Goals</span>
        </NavLink>
        <NavLink to="/reviews" className={linkClass}><span className="link-text">My Reviews</span></NavLink>
        <NavLink to="/history" className={linkClass}>
          <span className="link-text">📈 Learning History</span>
        </NavLink>
        <NavLink to="/wishlist" className={linkClass}>
          <span className="link-text">💖 Wishlist</span>
        </NavLink>

        <NavLink to="/apply-teacher" className={linkClass} style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
          <span className="link-text">👨‍🏫 Become a Teacher</span>
        </NavLink>
      </nav>
    </aside>
  );
}
