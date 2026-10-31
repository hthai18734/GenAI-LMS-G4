import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../features/auth/useAuth.js';
import { ChatProvider } from './chat/ChatContext';
import ChatWidget from './chat/ChatWidget';

const titles = {
  '/admin/vouchers': 'Voucher Management',
  '/admin/vouchers/new': 'Create Voucher',
  '/notifications': 'Notifications',
  '/admin/teachers': 'Teacher Management',
  '/change-password': 'Change Password',
  '/admin/users': 'Account Management',
  '/admin/users/new': 'Create User',
  '/admin/reviews': 'Review Management',
  '/teacher/reviews': 'Course Reviews',
  '/reviews': 'My Reviews',
  '/teacher/quizzes/new': 'Create Quiz',
  '/teacher/assignments/new': 'Create Assignment',
  '/dashboard': 'Learning Dashboard',
  '/courses': 'Courses & Catalog',
  '/history': 'Learning History',
  '/certificates': 'My Certificates',
  '/profile': 'Profile & Account',
  '/settings': 'Notification Settings',
  '/apply-teacher': 'Teacher Application',
  '/teacher/dashboard': 'Teacher Dashboard',
  '/teacher/courses': 'My Courses',
  '/teacher/courses/new': 'Create Course',
  '/teacher/questions': 'Question Bank',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/teacher-applications': 'Teacher Applications',
  '/admin/moderation': 'Course Moderation',
  '/admin/categories': 'Category Management',
  '/wishlist': 'My Wishlist',
  '/learning-goals': 'Learning Goals',
  '/teacher/reports': 'Content Reports',
};


export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const currentTitle = titles[location.pathname] || (location.pathname.startsWith('/teacher/courses/') ? 'Edit Course' : location.pathname.startsWith('/teacher/quizzes/') ? 'Quiz Workspace' : location.pathname.startsWith('/teacher/assignments/') ? 'Edit Assignment' : location.pathname.startsWith('/quizzes/') ? 'Start Quiz' : location.pathname.startsWith('/quiz-attempts/') ? 'Quiz' : user?.role === 'admin' ? 'Admin Portal' : user?.role === 'teacher' ? 'Teacher Portal' : 'Student Portal');

  return (
    <ChatProvider><div className="student-layout">
      <Sidebar />
      <Navbar title={currentTitle} />
      <main className="student-content">
        <Suspense fallback={<div className="page-loading" role="status">Loading...</div>}>
          <Outlet />
        </Suspense>
      </main>
      <ChatWidget />
    </div></ChatProvider>
  );
}
