/**
 * Author: ThienDDN - CE182101 / Team
 * Created at: 01/10/2026
 * Description: Teacher Instructor Dashboard & Analytics Control Center
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../services/AuthContext';

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

  const loadDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await teacherService.getDashboard();
      setData(res.data || null);
      if (isManualRefresh) {
        addToast('Dữ liệu giảng dạy đã được cập nhật!', 'success');
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
      } catch (fallbackErr) {
        setError(err.message || 'Không thể tải bảng điều khiển giảng viên.');
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
          Thử lại
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
            <span>Không gian Giảng viên AI-LMS</span>
            <span className="teacher-hero-badge">Giảng viên đối tác</span>
          </h1>
          <p>
            Chào mừng trở lại, thầy/cô <strong>{user?.fullName || 'Giảng viên'}</strong>! Quản lý khóa học, theo dõi học viên và tạo nội dung đào tạo tương tác.
          </p>
        </div>
        <div className="teacher-hero-actions">
          <Link to="/teacher/courses/new" className="teacher-cta-btn">
            ➕ Tạo khóa học mới
          </Link>
          <button
            className="teacher-refresh-btn"
            disabled={refreshing}
            onClick={() => loadDashboardData(true)}
          >
            {refreshing ? 'Đang tải…' : '🔄'}
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
            <span className="admin-kpi-badge info">{publishedCourses} Đang mở</span>
          </div>
          <div>
            <div className="admin-kpi-value">{totalCourses}</div>
            <div className="admin-kpi-label">Tổng khóa học đã tạo</div>
          </div>
          <div className="admin-kpi-footer">
            <span>{draftCourses} Bản nháp · {publishedCourses} Đang mở</span>
            <span>Xem tất cả →</span>
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
            <div className="admin-kpi-label">Tổng lượt học viên tham gia</div>
          </div>
          <div className="admin-kpi-footer">
            <span>Theo dõi tiến độ học tập</span>
            <span>Tích cực</span>
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
              {pendingCourses > 0 ? `${pendingCourses} Đang chờ` : 'Không có'}
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{pendingCourses}</div>
            <div className="admin-kpi-label">Khóa học chờ Admin kiểm duyệt</div>
          </div>
          <div className="admin-kpi-footer">
            <span>Admin sẽ duyệt trong 24-48h</span>
            <span>Chi tiết →</span>
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
            <span className="admin-kpi-badge success">Công khai</span>
          </div>
          <div>
            <div className="admin-kpi-value">{publishedCourses}</div>
            <div className="admin-kpi-label">Khóa học đang hoạt động</div>
          </div>
          <div className="admin-kpi-footer">
            <span>Học viên có thể học ngay</span>
            <span>Mở →</span>
          </div>
        </div>
      </section>

      {/* ─── 3. Quick Action Shortcuts ──────────────────────────────── */}
      <section className="admin-shortcuts-card">
        <div className="admin-shortcuts-title">
          <span>⚡ Lối tắt công cụ giảng dạy</span>
        </div>
        <div className="admin-shortcuts-links">
          <Link to="/teacher/courses/new" className="admin-shortcut-btn primary">
            ➕ Soạn khóa học mới
          </Link>
          <Link to="/teacher/courses" className="admin-shortcut-btn secondary">
            📋 Quản lý toàn bộ khóa học ({totalCourses})
          </Link>
          <Link to="/profile" className="admin-shortcut-btn secondary">
            👤 Hồ sơ giảng viên
          </Link>
        </div>
      </section>

      {/* ─── 4. Main Split Grid ────────────────────────────────────── */}
      <section className="admin-split-grid">
        {/* Panel 1: Recent Courses */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Khóa học gần đây của bạn</h3>
              <span className="admin-panel-count">{coursesList.length} hiển thị</span>
            </div>
            <Link to="/teacher/courses" className="admin-panel-viewall">
              Tất cả khóa học →
            </Link>
          </div>
          <div className="admin-panel-list">
            {coursesList.length === 0 ? (
              <div className="admin-empty-panel">
                <span className="admin-empty-icon">📖</span>
                <p>Bạn chưa tạo khóa học nào trên hệ thống.</p>
                <Link to="/teacher/courses/new" className="teacher-empty-cta">
                  Tạo khóa học đầu tiên ngay
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
                        {course.category || 'Môn học'} · {course.duration || 0} giờ · {course.totalStudents || 0} học viên
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
                      Sửa
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
              <h3>Học viên mới ghi danh</h3>
              <span className="admin-panel-count">{recentEnrollments.length} gần đây</span>
            </div>
          </div>
          <div className="admin-panel-list">
            {recentEnrollments.length === 0 ? (
              <div className="admin-empty-panel">
                <span className="admin-empty-icon">👋</span>
                <p>Chưa có lượt ghi danh mới gần đây.</p>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Khi học viên đăng ký các khóa học đang mở, thông tin sẽ hiển thị tại đây.
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
                      <strong>{enr.userId?.fullName || 'Học viên'}</strong>
                      <span>
                        Khóa: {enr.courseId?.title || 'Khóa học'} · {new Date(enr.enrolledAt || enr.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <div className="admin-item-action">
                    <span className={`status-badge status-${enr.status === 'completed' ? 'open' : 'pending_review'}`}>
                      {enr.status === 'completed' ? 'Đã xong' : 'Đang học'}
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
            <span>Trạng thái các khóa học của bạn</span>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              Tổng cộng: {totalCourses} khóa
            </span>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Đã xuất bản (Published)</span>
              <span>{publishedCourses} ({calcPct(publishedCourses)}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill emerald" style={{ width: `${calcPct(publishedCourses)}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Đang chờ duyệt (Pending Review)</span>
              <span>{pendingCourses} ({calcPct(pendingCourses)}%)</span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill amber" style={{ width: `${calcPct(pendingCourses)}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Bản nháp đang biên soạn (Draft)</span>
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
            <span>💡 Lời khuyên duyệt khóa học nhanh</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#047857', lineHeight: 1.6 }}>
            <div>
              <strong>1. Tiêu đề rõ ràng:</strong> Đặt tên khóa học súc tích, phản ánh đúng kỹ năng trọng tâm.
            </div>
            <div>
              <strong>2. Mô tả chi tiết:</strong> Nêu rõ chuẩn đầu ra, kiến thức tiên quyết và đối tượng phù hợp.
            </div>
            <div>
              <strong>3. Thời lượng hợp lý:</strong> Phân chia bài học thành các phần ngắn từ 5-15 phút để học viên dễ tiếp thu.
            </div>
            <div>
              <strong>4. Nộp duyệt kiểm duyệt:</strong> Sau khi hoàn thành bản nháp, bấm nút <em>"Submit for review"</em> để ban quản trị thẩm định và mở lớp.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
