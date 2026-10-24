/**
 * Author: ThienDDN - CE182101 / Team
 * Created at: 01/10/2026
 * Description: Unified Admin Dashboard & Analytics Control Center
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../features/admin/api.js';
import { useToast } from '../components/Toast';
import { useAuth } from '../features/auth/useAuth.js';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await adminService.getDashboard();
      setData(res.data || null);
      if (isManualRefresh) {
        addToast('Dashboard data refreshed!', 'success');
      }
    } catch (err) {
      console.warn('Dashboard API failed, attempting fallback aggregations...', err);
      // Fallback: try querying available endpoints concurrently
      try {
        const [appsRes, coursesRes, catRes] = await Promise.all([
          adminService.getTeacherApplications().catch(() => ({ data: { applications: [] } })),
          adminService.getModerationCourses('status=PENDING_REVIEW').catch(() => ({ data: { courses: [] } })),
          adminService.getCategories().catch(() => ({ data: { categories: [] } })),
        ]);

        const apps = appsRes.data?.applications || [];
        const pendingApps = apps.filter((a) => a.status === 'pending');
        const courses = coursesRes.data?.courses || [];
        const categories = catRes.data?.categories || [];

        setData({
          metrics: {
            users: { total: 1, students: 0, teachers: 0, admins: 1 },
            applications: {
              pending: pendingApps.length,
              approved: apps.filter((a) => a.status === 'approved').length,
              rejected: apps.filter((a) => a.status === 'rejected').length,
              total: apps.length,
            },
            courses: {
              PENDING_REVIEW: courses.length,
              total: courses.length,
            },
            categories: {
              total: categories.length,
            },
          },
          recentApplications: pendingApps.slice(0, 5),
          recentPendingCourses: courses.slice(0, 5),
          recentUsers: [],
        });
      } catch (fallbackErr) {
        setError(err.message || 'Unable to load admin statistics.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page-error" style={{ margin: '30px' }}>
        <span>{error}</span>
        <button className="primary" onClick={() => loadDashboardData()}>
          Try Again
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const users = metrics.users || { total: 0, students: 0, teachers: 0, admins: 0 };
  const applications = metrics.applications || { pending: 0, approved: 0, rejected: 0, total: 0 };
  const courses = metrics.courses || { PENDING_REVIEW: 0, APPROVED: 0, PUBLIC: 0, DRAFT: 0, REJECTED: 0, ARCHIVED: 0, total: 0 };
  const categories = metrics.categories || { total: 0 };

  const recentApps = data?.recentApplications || [];
  const recentCourses = data?.recentPendingCourses || [];
  const recentUsers = data?.recentUsers || [];

  // Compute percentages for distribution bars
  const totalUsersCount = users.total || 1;
  const studentPct = Math.round((users.students / totalUsersCount) * 100);
  const teacherPct = Math.round((users.teachers / totalUsersCount) * 100);
  const adminPct = Math.round((users.admins / totalUsersCount) * 100);

  const totalCoursesCount = courses.total || 1;
  const publishedCoursesPct = Math.round(((courses.PUBLIC || 0) / totalCoursesCount) * 100);
  const pendingCoursesPct = Math.round(((courses.PENDING_REVIEW || 0) / totalCoursesCount) * 100);
  const draftCoursesPct = Math.round(((courses.DRAFT || 0) / totalCoursesCount) * 100);

  return (
    <div className="admin-dashboard">
      {/* ─── 1. Hero Header Banner ─────────────────────────────────── */}
      <section className="admin-hero-banner">
        <div className="admin-hero-content">
          <h1>
            <span>AI-LMS Admin Center</span>
            <span className="admin-hero-badge">System Ready</span>
          </h1>
          <p>
            Hello <strong>{user?.fullName || 'Admin'}</strong>! Monitor activity, review teacher applications, and moderate courses in real time.
          </p>
        </div>
        <div className="admin-hero-actions">
          <button
            className="admin-refresh-btn"
            disabled={refreshing}
            onClick={() => loadDashboardData(true)}
          >
            {refreshing ? 'Refreshing…' : '🔄 Refresh Data'}
          </button>
        </div>
      </section>

      {/* ─── 2. Top KPI Cards ──────────────────────────────────────── */}
      <section className="admin-kpi-grid">
        {/* KPI 1: Users */}
        <div className="admin-kpi-card" onClick={() => navigate('/admin/categories')} style={{ cursor: 'pointer' }}>
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon purple">👥</div>
            <span className="admin-kpi-badge info">{users.students} Students</span>
          </div>
          <div>
            <div className="admin-kpi-value">{users.total}</div>
            <div className="admin-kpi-label">Total Users</div>
          </div>
          <div className="admin-kpi-footer">
            <span>{users.teachers} Teachers · {users.admins} Admins</span>
            <span>→</span>
          </div>
        </div>

        {/* KPI 2: Teacher Applications */}
        <div
          className="admin-kpi-card"
          onClick={() => navigate('/admin/teacher-applications')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon amber">👨‍🏫</div>
            <span className={`admin-kpi-badge ${applications.pending > 0 ? 'alert' : 'success'}`}>
              {applications.pending > 0 ? `${applications.pending} Pending Review` : 'All Reviewed'}
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{applications.pending}</div>
            <div className="admin-kpi-label">Teacher Applications</div>
          </div>
          <div className="admin-kpi-footer">
            <span>{applications.approved} Approved · {applications.rejected} Rejected</span>
            <span>Review →</span>
          </div>
        </div>

        {/* KPI 3: Course Moderation */}
        <div
          className="admin-kpi-card"
          onClick={() => navigate('/admin/moderation')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon emerald">🛡️</div>
            <span className={`admin-kpi-badge ${courses.PENDING_REVIEW > 0 ? 'alert' : 'info'}`}>
              {courses.PENDING_REVIEW > 0 ? `${courses.PENDING_REVIEW} Pending Review` : 'All Clear'}
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{courses.PENDING_REVIEW || 0}</div>
            <div className="admin-kpi-label">Courses Pending Review</div>
          </div>
          <div className="admin-kpi-footer">
            <span>{courses.PUBLIC || 0} Published</span>
            <span>Moderate →</span>
          </div>
        </div>

        {/* KPI 4: Categories */}
        <div
          className="admin-kpi-card"
          onClick={() => navigate('/admin/categories')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon blue">🏷️</div>
            <span className="admin-kpi-badge info">Active</span>
          </div>
          <div>
            <div className="admin-kpi-value">{categories.total || 0}</div>
            <div className="admin-kpi-label">Course Categories</div>
          </div>
          <div className="admin-kpi-footer">
            <span>Organize Course Categories</span>
            <span>Manage →</span>
          </div>
        </div>
      </section>

      {/* ─── 3. Quick Action Shortcuts ──────────────────────────────── */}
      <section className="admin-shortcuts-card">
        <div className="admin-shortcuts-title">
          <span>⚡ Quick Actions</span>
        </div>
        <div className="admin-shortcuts-links">
          <Link to="/admin/teacher-applications" className="admin-shortcut-btn primary">
            👨‍🏫 Review Teacher Applications {applications.pending > 0 && `(${applications.pending})`}
          </Link>
          <Link to="/admin/moderation" className="admin-shortcut-btn primary">
            🛡️ Course Moderation {courses.PENDING_REVIEW > 0 && `(${courses.PENDING_REVIEW})`}
          </Link>
          <Link to="/admin/categories" className="admin-shortcut-btn secondary">
            🏷️ Add & Edit Categories
          </Link>
        </div>
      </section>

      {/* ─── 4. Main Split Grid: Pending Queues ────────────────────── */}
      <section className="admin-split-grid">
        {/* Panel 1: Pending Teacher Applications */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Recent Teacher Applications</h3>
              <span className={`admin-panel-count ${applications.pending > 0 ? 'alert' : ''}`}>
                {applications.pending} pending
              </span>
            </div>
            <Link to="/admin/teacher-applications" className="admin-panel-viewall">
              View all →
            </Link>
          </div>
          <div className="admin-panel-list">
            {recentApps.length === 0 ? (
              <div className="admin-empty-panel">
                <span className="admin-empty-icon">🎉</span>
                <p>No teacher applications are awaiting review!</p>
              </div>
            ) : (
              recentApps.map((app) => (
                <div className="admin-panel-item" key={app._id}>
                  <div className="admin-item-info">
                    <div className="admin-item-avatar">
                      {(app.userId?.fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-item-meta">
                      <strong>{app.userId?.fullName || 'Applicant'}</strong>
                      <span>{app.userId?.email || 'No email'} · {app.bio ? app.bio.slice(0, 38) + '…' : 'No bio'}</span>
                    </div>
                  </div>
                  <div className="admin-item-action">
                    <Link to="/admin/teacher-applications" className="admin-quick-action-btn">
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Courses Pending Moderation */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Courses Pending Review</h3>
              <span className={`admin-panel-count ${courses.PENDING_REVIEW > 0 ? 'alert' : ''}`}>
                {courses.PENDING_REVIEW || 0} pending
              </span>
            </div>
            <Link to="/admin/moderation" className="admin-panel-viewall">
              View Queue →
            </Link>
          </div>
          <div className="admin-panel-list">
            {recentCourses.length === 0 ? (
              <div className="admin-empty-panel">
                <span className="admin-empty-icon">✨</span>
                <p>All courses have been reviewed, or no new courses have been submitted!</p>
              </div>
            ) : (
              recentCourses.map((course) => (
                <div className="admin-panel-item" key={course._id}>
                  <div className="admin-item-info">
                    <div className="admin-item-avatar" style={{ background: '#d1fae5', color: '#059669' }}>
                      📚
                    </div>
                    <div className="admin-item-meta">
                      <strong>{course.title}</strong>
                      <span>
                        Teacher: {course.teacherId?.fullName || 'Unknown'} · {course.category || 'Subject'}
                      </span>
                    </div>
                  </div>
                  <div className="admin-item-action">
                    <Link to="/admin/moderation" className="admin-quick-action-btn">
                      Review Now
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ─── 5. Analytics & Distribution ───────────────────────────── */}
      <section className="admin-analytics-grid">
        {/* Distribution Card 1: Users */}
        <div className="admin-chart-card">
          <div className="admin-chart-title">
            <span>User Distribution</span>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              Total: {users.total} members
            </span>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Students</span>
              <span>{users.students} ({studentPct}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill purple" style={{ width: `${studentPct}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Teachers</span>
              <span>{users.teachers} ({teacherPct}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill emerald" style={{ width: `${teacherPct}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Admins</span>
              <span>{users.admins} ({adminPct}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill blue" style={{ width: `${adminPct}%` }}></div>
            </div>
          </div>
        </div>

        {/* Distribution Card 2: Course Lifecycle Status */}
        <div className="admin-chart-card">
          <div className="admin-chart-title">
            <span>Course Status Distribution</span>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              Total: {courses.total || 0} courses
            </span>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Published</span>
              <span>{courses.PUBLIC || 0} ({publishedCoursesPct}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill emerald" style={{ width: `${publishedCoursesPct}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Pending Review</span>
              <span>{courses.PENDING_REVIEW || 0} ({pendingCoursesPct}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill amber" style={{ width: `${pendingCoursesPct}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Draft</span>
              <span>{courses.DRAFT || 0} ({draftCoursesPct}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill purple" style={{ width: `${draftCoursesPct}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. Recent Registered Users Table ─────────────────────── */}
      {recentUsers.length > 0 && (
        <section className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Recently Registered Accounts</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="admin-recent-users-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.fullName}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-pill ${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${u.status === 'active' ? 'open' : 'draft'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '12px' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
