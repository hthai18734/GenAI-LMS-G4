import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

const linkClass = ({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`;

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || 'student';

  if (role === 'teacher') {
    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>AI-LMS Giảng viên</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/teacher/dashboard" className={linkClass}>
            <span className="link-text">📊 Dashboard</span>
          </NavLink>
          <NavLink to="/teacher/courses" end className={linkClass}>
            <span className="link-text">📚 Khóa học của tôi</span>
          </NavLink>
          <NavLink to="/teacher/courses/new" className={linkClass}>
            <span className="link-text">➕ Tạo khóa học mới</span>
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
          <NavLink to="/admin/users" className={linkClass}>
            <span className="link-text">👥 User Management</span>
          </NavLink>
          <NavLink to="/admin/moderation" className={linkClass}>
            <span className="link-text">🛡️ Course Moderation</span>
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
        <span>AI-LMS Học viên</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={linkClass}>
          <span className="link-text">🏠 Trang chủ</span>
        </NavLink>
        <NavLink to="/courses" className={linkClass}>
          <span className="link-text">📚 Khóa học</span>
        </NavLink>
        <NavLink to="/history" className={linkClass}>
          <span className="link-text">📈 Tiến độ & Lịch sử</span>
        </NavLink>
        <NavLink to="/certificates" className={linkClass}>
          <span className="link-text">📜 Chứng chỉ của tôi</span>
        </NavLink>
      </nav>
    </aside>
  );
}
