import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../services/AuthContext';
import { ChatProvider } from './chat/ChatContext';
import ChatWidget from './chat/ChatWidget';

const titles = {
  '/dashboard': 'Trang chủ học tập',
  '/courses': 'Khóa học & Danh mục đào tạo',
  '/history': 'Lịch sử học tập',
  '/certificates': 'Chứng chỉ của tôi',
  '/profile': 'Hồ sơ cá nhân & Tài khoản',
  '/settings': 'Cài đặt thông báo',
  '/apply-teacher': 'Đăng ký làm Giảng viên (Teacher Application)',
  '/teacher/dashboard': 'Tổng quan Giảng dạy (Teacher Dashboard)',
  '/teacher/courses': 'Khóa học của tôi',
  '/teacher/courses/new': 'Soạn khóa học mới',
  '/admin/dashboard': 'Tổng quan Quản trị (Admin Dashboard)',
  '/admin/teacher-applications': 'Duyệt đơn giảng viên (Teacher Applications)',
  '/admin/moderation': 'Kiểm duyệt khóa học (Course Moderation)',
  '/admin/categories': 'Quản lý danh mục (Category Management)',
};

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const currentTitle = titles[location.pathname] || (location.pathname.startsWith('/teacher/courses/') ? 'Edit Course' : user?.role === 'admin' ? 'Admin Portal' : user?.role === 'teacher' ? 'Teacher Portal' : 'Student Portal');

  return (
    <ChatProvider><div className="student-layout">
      <Sidebar />
      <Navbar title={currentTitle} />
      <main className="student-content">
        <Outlet />
      </main>
      <ChatWidget />
    </div></ChatProvider>
  );
}
