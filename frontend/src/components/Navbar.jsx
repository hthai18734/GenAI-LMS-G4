import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';
import { notificationService } from '../features/engagement/api.js';
import { useToast } from './Toast';

/* ── tiny helper: time-ago ─────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  /* ── Notification state ──────────────────────────────────── */
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notiRef = useRef(null);

  const isAuthenticated = Boolean(user);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.unreadCount || 0);
    } catch { /* ignore */ }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getNotifications(20);
      setNotifications(res.data?.notifications || []);
    } catch { /* ignore */ }
  }, [isAuthenticated]);

  // Initial fetch + periodic polling every 30s + reactive event updates
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);

    const handleUpdate = () => {
      fetchUnreadCount();
      if (notiOpen) fetchNotifications();
    };
    window.addEventListener('notification-updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-updated', handleUpdate);
    };
  }, [fetchUnreadCount, fetchNotifications, notiOpen]);

  // Fetch full list when bell panel opens
  useEffect(() => {
    if (notiOpen) fetchNotifications();
  }, [notiOpen, fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      await fetchUnreadCount();
    } catch (err) { addToast(err.message, 'error'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetchUnreadCount();
    } catch (err) { addToast(err.message, 'error'); }
  };

  /* ── Close dropdowns on outside click ────────────────────── */
  const roleNameMap = {
    admin: 'Admin',
    teacher: 'Teacher',
    student: 'Student',
  };
  const roleLabel = roleNameMap[user?.role] || 'Student';

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.role === 'admin'
    ? 'AD'
    : user?.role === 'teacher'
    ? 'GV'
    : 'HV';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
      if (notiRef.current && !notiRef.current.contains(event.target)) {
        setNotiOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        setNotiOpen(false);
      }
    }

    if (open || notiOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, notiOpen]);

  const handleLogout = async () => {
    setOpen(false);
    navigate('/', { replace: true });
    try {
      await logout();
      addToast('Signed out successfully.', 'info');
    } catch {
      // ignore
    }
  };

  /* ── Notification type icons ─────────────────────────────── */
  const typeIcon = {
    course: '📚',
    'teacher approval': '✅',
    'teacher rejection': '❌',
    system: '⚙️',
    deadline: '⏰',
    grade: '📝',
    general: '🔔',
  };

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title || 'Learning Space'}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* ── Notification Bell ──────────────────────────────── */}
        {isAuthenticated && (
          <div className="noti-bell-wrap" ref={notiRef}>
            <button
              type="button"
              className="noti-bell-btn"
              onClick={() => { setNotiOpen(!notiOpen); setOpen(false); }}
              aria-label="Notifications"
              title="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="noti-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {notiOpen && (
              <div className="noti-dropdown">
                <div className="noti-dropdown-header">
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>🔔 Notifications</span>
                  {unreadCount > 0 && (
                    <button type="button" className="noti-mark-all-btn" onClick={handleMarkAllRead}>
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="noti-dropdown-body">
                  <Link to="/notifications" className="dropdown-item" onClick={() => setNotiOpen(false)}>View all notifications</Link>
                  {notifications.length === 0 ? (
                    <div className="noti-empty">
                      <span style={{ fontSize: '32px' }}>📭</span>
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`noti-item ${n.isRead ? '' : 'noti-unread'}`}
                        onClick={() => !n.isRead && handleMarkRead(n.id)}
                        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!n.isRead) handleMarkRead(n.id); } }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="noti-item-icon">{typeIcon[n.type] || '🔔'}</div>
                        <div className="noti-item-content">
                          <div className="noti-item-title">{n.title}</div>
                          <div className="noti-item-msg">{n.message}</div>
                          <div className="noti-item-time">{timeAgo(n.createdAt)}</div>
                        </div>
                        {!n.isRead && <div className="noti-dot" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Pill & Dropdown */}
        <div className="topbar-user-wrap" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => { setOpen(!open); setNotiOpen(false); }}
            className={`topbar-user-btn ${open ? 'open' : ''}`}
            aria-expanded={open}
            aria-haspopup="true"
          >
            <div className="topbar-avatar" title={user?.fullName || 'User'}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.fullName} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="topbar-user-info">
              <div className="topbar-name">{user?.fullName || (user?.role === 'admin' ? 'Admin' : 'Student')}</div>
              <div className="topbar-role">{roleLabel}</div>
            </div>
            <svg
              className={`topbar-chevron ${open ? 'open' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {open && (
            <div className="topbar-dropdown" role="menu">
              <div className="dropdown-header">
                <div className="dropdown-name">{user?.fullName || (user?.role === 'admin' ? 'Admin' : 'Student')}</div>
                <div className="dropdown-email">{user?.email || ''}</div>
                <div className="dropdown-badge">{roleLabel} account</div>
              </div>

              <div className="dropdown-list">
                <Link to="/change-password" className="dropdown-item" onClick={() => setOpen(false)} role="menuitem">Change Password</Link>
                {user?.role === 'admin' ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>📊 Admin Dashboard</span>
                    </Link>
                    <Link
                      to="/admin/teacher-applications"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>👨‍🏫 Review Teacher Applications</span>
                    </Link>
                    <Link
                      to="/admin/moderation"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>🛡️ Course Moderation</span>
                    </Link>
                    <Link
                      to="/admin/categories"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>🏷️ Manage Categories</span>
                    </Link>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>👤 Profile</span>
                    </Link>
                  </>
                ) : user?.role === 'teacher' ? (
                  <>
                    <Link
                      to="/teacher/dashboard"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>📊 Teacher Dashboard</span>
                    </Link>
                    <Link
                      to="/teacher/courses"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>📚 My Courses</span>
                    </Link>
                    <Link
                      to="/teacher/courses/new"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>➕ Create Course</span>
                    </Link>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>👤 Profile</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </Link>

                    <Link
                      to="/certificates"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span>My Certificates</span>
                    </Link>

                    <Link
                      to="/my-reports"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>📢 My Reports & Feedback</span>
                    </Link>

                    <Link
                      to="/settings"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span>Notification Settings</span>
                    </Link>
                  </>
                )}

                <div className="dropdown-divider"></div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="dropdown-item logout"
                  role="menuitem"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
