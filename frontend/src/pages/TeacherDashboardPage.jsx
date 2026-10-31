/**
 * Author: ThienDDN - CE182101 / Team
 * Created at: 01/10/2026
 * Description: Teacher Instructor Dashboard & Analytics Control Center
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';
import { useAuth } from '../features/auth/useAuth.js';

const statusLabels = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PUBLIC: 'Public',
  ARCHIVED: 'Archived',
};

export default function TeacherDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await teacherService.getDashboard();
      setData(res.data || null);
      if (isManualRefresh) {
        addToast('Teaching data refreshed!', 'success');
      }
    } catch (err) {
      console.warn('Teacher dashboard API failed, falling back to courses list...', err);
      // Fallback: fetch teacher courses directly
      try {
        const coursesRes = await teacherService.getCourses();
        const courses = coursesRes.data?.courses || [];

        const pending = courses.filter((c) => c.status === 'PENDING_REVIEW').length;
        const published = courses.filter((c) => c.status === 'PUBLIC').length;
        const draft = courses.filter((c) => c.status === 'DRAFT').length;
        const rejected = courses.filter((c) => c.status === 'REJECTED').length;
        const totalStudents = courses.reduce((acc, c) => acc + (c.totalStudents || 0), 0);

        setData({
          metrics: {
            totalCourses: courses.length,
            publishedCourses: published,
            pendingCourses: pending,
            draftCourses: draft,
            rejectedCourses: rejected,
            totalStudents,
          },
          courses: courses.slice(0, 5),
          recentEnrollments: [],
        });
      } catch {
        setError(err.message || 'Unable to load the teacher dashboard.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboardData);
  }, [loadDashboardData]);

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
  const coursesList = data?.courses || [];
  const recentEnrollments = data?.recentEnrollments || [];

  const totalCourses = metrics.totalCourses || 0;
  const publishedCourses = metrics.publishedCourses || 0;
  const pendingCourses = metrics.pendingCourses || 0;
  const draftCourses = metrics.draftCourses || 0;
  const totalStudents = metrics.totalStudents || 0;

  // Percentage for distribution
  const calcPct = (val) => (totalCourses > 0 ? Math.round((val / totalCourses) * 100) : 0);

  return (
    <div className="teacher-dashboard">
      {/* ─── 1. Hero Header Banner ─────────────────────────────────── */}
      <section className="teacher-hero-banner">
        <div className="teacher-hero-content">
          <h1>
            <span>AI-LMS Teacher Workspace</span>
            <span className="teacher-hero-badge">Teaching Partner</span>
          </h1>
          <p>
            Welcome back, <strong>{user?.fullName || 'Teacher'}</strong>! Manage courses, track students, and create interactive learning content.
          </p>
        </div>
        <div className="teacher-hero-actions">
          <Link to="/teacher/courses/new" className="teacher-cta-btn">
            ➕ Create Course
          </Link>
          <button
            className="teacher-refresh-btn"
            disabled={refreshing}
            onClick={() => loadDashboardData(true)}
          >
            {refreshing ? 'Loading…' : '🔄'}
          </button>
        </div>
      </section>

      {/* ─── 2. Top KPI Cards ──────────────────────────────────────── */}
      <section className="admin-kpi-grid">
        {/* KPI 1: Total Courses */}
        <div
          className="admin-kpi-card"
          onClick={() => navigate('/teacher/courses')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon emerald">📚</div>
            <span className="admin-kpi-badge info">{publishedCourses} Published</span>
          </div>
          <div>
            <div className="admin-kpi-value">{totalCourses}</div>
            <div className="admin-kpi-label">Total Courses Created</div>
          </div>
          <div className="admin-kpi-footer">
            <span>{draftCourses} Draft · {publishedCourses} Published</span>
            <span>View all →</span>
          </div>
        </div>

        {/* KPI 2: Total Enrolled Students */}
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon purple">👥</div>
            <span className="admin-kpi-badge success">Ghi danh</span>
          </div>
          <div>
            <div className="admin-kpi-value">{totalStudents}</div>
            <div className="admin-kpi-label">Total Enrollments</div>
          </div>
          <div className="admin-kpi-footer">
            <span>Track learning progress</span>
            <span>Active</span>
          </div>
        </div>

        {/* KPI 3: Pending Review Courses */}
        <div
          className="admin-kpi-card"
          onClick={() => navigate('/teacher/courses')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon amber">⏳</div>
            <span className={`admin-kpi-badge ${pendingCourses > 0 ? 'alert' : 'info'}`}>
              {pendingCourses > 0 ? `${pendingCourses} Pending` : 'None'}
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{pendingCourses}</div>
            <div className="admin-kpi-label">Courses Pending Admin Review</div>
          </div>
          <div className="admin-kpi-footer">
            <span>Admin review usually takes 24–48 hours</span>
            <span>Details →</span>
          </div>
        </div>

        {/* KPI 4: Published Courses */}
        <div
          className="admin-kpi-card"
          onClick={() => navigate('/teacher/courses')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon blue">⭐</div>
            <span className="admin-kpi-badge success">Public</span>
          </div>
          <div>
            <div className="admin-kpi-value">{publishedCourses}</div>
            <div className="admin-kpi-label">Active Courses</div>
          </div>
          <div className="admin-kpi-footer">
            <span>Available for students to learn</span>
            <span>Open →</span>
          </div>
        </div>
      </section>

      {/* ─── 3. Quick Action Shortcuts ──────────────────────────────── */}
      <section className="admin-shortcuts-card">
        <div className="admin-shortcuts-title">
          <span>⚡ Teaching Shortcuts</span>
        </div>
        <div className="admin-shortcuts-links">
          <Link to="/teacher/courses/new" className="admin-shortcut-btn primary">
            ➕ Create Course
          </Link>
          <Link to="/teacher/courses" className="admin-shortcut-btn secondary">
            📋 Manage All Courses ({totalCourses})
          </Link>
          <Link to="/profile" className="admin-shortcut-btn secondary">
            👤 Teacher Profile
          </Link>
        </div>
      </section>

      {/* ─── 4. Main Split Grid ────────────────────────────────────── */}
      <section className="admin-split-grid">
        {/* Panel 1: Recent Courses */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Your Recent Courses</h3>
              <span className="admin-panel-count">{coursesList.length} shown</span>
            </div>
            <Link to="/teacher/courses" className="admin-panel-viewall">
              All courses →
            </Link>
          </div>
          <div className="admin-panel-list">
            {coursesList.length === 0 ? (
              <div className="admin-empty-panel">
                <span className="admin-empty-icon">📖</span>
                <p>You have not created any courses yet.</p>
                <Link to="/teacher/courses/new" className="teacher-empty-cta">
                  Create Your First Course
                </Link>
              </div>
            ) : (
              coursesList.map((course) => (
                <div className="admin-panel-item" key={course._id}>
                  <div className="admin-item-info">
                    <div className="admin-item-avatar" style={{ background: '#ecfdf5', color: '#047857' }}>
                      🎓
                    </div>
                    <div className="admin-item-meta">
                      <strong>{course.title}</strong>
                      <span>
                        {course.category || 'Subject'} · {course.duration || 0} hours · {course.totalStudents || 0} students
                      </span>
                    </div>
                  </div>
                  <div className="admin-item-action" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-badge status-${course.status}`}>
                      {statusLabels[course.status] || course.status}
                    </span>
                    <button
                      className="admin-quick-action-btn"
                      onClick={() => navigate(`/teacher/courses/${course._id}/edit`)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Recent Student Enrollments */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Recent Enrollments</h3>
              <span className="admin-panel-count">{recentEnrollments.length} recent</span>
            </div>
          </div>
          <div className="admin-panel-list">
            {recentEnrollments.length === 0 ? (
              <div className="admin-empty-panel">
                <span className="admin-empty-icon">👋</span>
                <p>No recent enrollments yet.</p>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  New enrollments in your published courses will appear here.
                </span>
              </div>
            ) : (
              recentEnrollments.map((enr) => (
                <div className="admin-panel-item" key={enr._id}>
                  <div className="admin-item-info">
                    <div className="admin-item-avatar" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      {(enr.userId?.fullName || 'H').charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-item-meta">
                      <strong>{enr.userId?.fullName || 'Student'}</strong>
                      <span>
                        Course: {enr.courseId?.title || 'Course'} · {new Date(enr.enrolledAt || enr.createdAt).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  </div>
                  <div className="admin-item-action">
                    <span className={`status-badge status-${enr.status === 'completed' ? 'open' : 'pending_review'}`}>
                      {enr.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ─── 5. Course Pipeline Analytics & Tips ─────────────────────── */}
      <section className="admin-analytics-grid">
        {/* Pipeline Chart */}
        <div className="admin-chart-card">
          <div className="admin-chart-title">
            <span>Your Course Statuses</span>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              Total: {totalCourses} courses
            </span>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Published</span>
              <span>{publishedCourses} ({calcPct(publishedCourses)}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill emerald" style={{ width: `${calcPct(publishedCourses)}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Pending Review</span>
              <span>{pendingCourses} ({calcPct(pendingCourses)}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill amber" style={{ width: `${calcPct(pendingCourses)}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Draft</span>
              <span>{draftCourses} ({calcPct(draftCourses)}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill purple" style={{ width: `${calcPct(draftCourses)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Teaching Quality & Guidelines Card */}
        <div className="admin-chart-card" style={{ background: '#f8fdfa', borderColor: '#a7f3d0' }}>
          <div className="admin-chart-title" style={{ color: '#065f46' }}>
            <span>💡 Tips for Course Approval</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#047857', lineHeight: 1.6 }}>
            <div>
              <strong>1. Clear title:</strong> Use a concise course title that reflects its main skills.
            </div>
            <div>
              <strong>2. Detailed description:</strong> Describe the learning outcomes, prerequisites, and intended audience.
            </div>
            <div>
              <strong>3. Appropriate duration:</strong> Break lessons into 5–15 minute sections to help students learn.
            </div>
            <div>
              <strong>4. Submit for review:</strong> After completing your draft, select <em>"Submit for review"</em> so an administrator can review and publish your course.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
