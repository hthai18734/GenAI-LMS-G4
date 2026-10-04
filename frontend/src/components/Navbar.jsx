import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { notificationService } from '../services/api';
import { useToast } from './Toast';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

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
    } catch {}
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getNotifications(20);
      setNotifications(res.data?.notifications || []);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (notiOpen) fetchNotifications();
  }, [notiOpen, fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const roleNameMap = {
    admin: 'Quản trị viên',
    teacher: 'Giảng viên',
    student: 'Học viên',
  };
  const roleLabel = roleNameMap[user?.role] || 'Học viên';

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
      addToast('Đã đăng xuất thành công.', 'info');
    } catch {}
  };

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
      <h1 className="topbar-title">{title || 'Không gian học tập'}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isAuthenticated && (
          <div className="noti-bell-wrap" ref={notiRef}>
            <button
              type="button"
              className="noti-bell-btn"
              onClick={() => {
                setNotiOpen(!notiOpen);
                setOpen(false);
              }}
              aria-label="Thông báo"
              title="Thông báo"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="22"
                height="22"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="noti-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {notiOpen && (
              <div className="noti-dropdown">
                <div className="noti-dropdown-header">
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>🔔 Thông báo</span>
                  {unreadCount > 0 && (
                    <button type="button" className="noti-mark-all-btn" onClick={handleMarkAllRead}>
                      Đánh dấu tất cả đã đọc
                    </button>
                  )}
                </div>

                <div className="noti-dropdown-body">
                  {notifications.length === 0 ? (
                    <div className="noti-empty">
                      <span style={{ fontSize: '32px' }}>📭</span>
                      <p>Chưa có thông báo nào</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`noti-item ${n.isRead ? '' : 'noti-unread'}`}
                        onClick={() => !n.isRead && handleMarkRead(n.id)}
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

        <div className="topbar-user-wrap" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
              setNotiOpen(false);
            }}
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
              <div className="topbar-name">
                {user?.fullName || (user?.role === 'admin' ? 'Admin' : 'Học viên')}
              </div>
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

          {open && (
            <div className="topbar-dropdown" role="menu">
              <div className="dropdown-header">
                <div className="dropdown-name">
                  {user?.fullName || (user?.role === 'admin' ? 'Admin' : 'Học viên')}
                </div>
                <div className="dropdown-email">{user?.email || ''}</div>
                <div className="dropdown-badge">Tài khoản {roleLabel.toLowerCase()}</div>
              </div>

              <div className="dropdown-list">
                {user?.role === 'admin' ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>📊 Bảng điều khiển Admin</span>
                    </Link>
                    <Link
                      to="/admin/teacher-applications"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>👨‍🏫 Duyệt đơn giảng viên</span>
                    </Link>
                    <Link
                      to="/admin/moderation"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>🛡️ Kiểm duyệt khóa học</span>
                    </Link>
                    <Link
                      to="/admin/categories"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>🏷️ Quản lý danh mục</span>
                    </Link>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>👤 Hồ sơ cá nhân</span>
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
                      <span>📊 Bảng điều khiển Giảng viên</span>
                    </Link>
                    <Link
                      to="/teacher/courses"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>📚 Khóa học của tôi</span>
                    </Link>
                    <Link
                      to="/teacher/courses/new"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>➕ Tạo khóa học mới</span>
                    </Link>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <span>👤 Hồ sơ cá nhân</span>
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    <Link
                      to="/certificates"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                        />
                      </svg>
                      <span>Chứng chỉ của tôi</span>
                    </Link>

                    <Link
                      to="/settings"
                      className="dropdown-item"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                      <span>Cài đặt thông báo</span>
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
