import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../services/AuthContext';

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
        addToast('Dữ liệu dashboard đã được cập nhật!', 'success');
      }
    } catch (err) {
      console.warn('Dashboard API failed, attempting fallback aggregations...', err);

      try {
        const [appsRes, coursesRes, catRes] = await Promise.all([
          adminService.getTeacherApplications().catch(() => ({ data: { applications: [] } })),
          adminService
            .getModerationCourses('status=PENDING_REVIEW')
            .catch(() => ({ data: { courses: [] } })),
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
        setError(err.message || 'Không thể tải thông tin thống kê admin.');
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
  const users = metrics.users || { total: 0, students: 0, teachers: 0, admins: 0 };
  const applications = metrics.applications || { pending: 0, approved: 0, rejected: 0, total: 0 };
  const courses = metrics.courses || {
    PENDING_REVIEW: 0,
    APPROVED: 0,
    PUBLIC: 0,
    DRAFT: 0,
    REJECTED: 0,
    ARCHIVED: 0,
    total: 0,
  };
  const categories = metrics.categories || { total: 0 };

  const recentApps = data?.recentApplications || [];
  const recentCourses = data?.recentPendingCourses || [];
  const recentUsers = data?.recentUsers || [];

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
      <section className="admin-hero-banner">
        <div className="admin-hero-content">
          <h1>
            <span>Trung tâm quản trị AI-LMS</span>
            <span className="admin-hero-badge">Hệ thống sẵn sàng</span>
          </h1>
          <p>
            Xin chào <strong>{user?.fullName || 'Admin'}</strong>! Theo dõi trạng thái hoạt động,
            phê duyệt giảng viên và kiểm duyệt khóa học theo thời gian thực.
          </p>
        </div>
        <div className="admin-hero-actions">
          <button
            className="admin-refresh-btn"
            disabled={refreshing}
            onClick={() => loadDashboardData(true)}
          >
            {refreshing ? 'Đang cập nhật…' : '🔄 Làm mới dữ liệu'}
          </button>
        </div>
      </section>

      <section className="admin-kpi-grid">
        <div
          className="admin-kpi-card"
          onClick={() => navigate('/admin/categories')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon purple">👥</div>
            <span className="admin-kpi-badge info">{users.students} Học viên</span>
          </div>
          <div>
            <div className="admin-kpi-value">{users.total}</div>
            <div className="admin-kpi-label">Tổng người dùng hệ thống</div>
          </div>
          <div className="admin-kpi-footer">
            <span>
              {users.teachers} Giảng viên · {users.admins} Admin
            </span>
            <span>→</span>
          </div>
        </div>

        <div
          className="admin-kpi-card"
          onClick={() => navigate('/admin/teacher-applications')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon amber">👨‍🏫</div>
            <span className={`admin-kpi-badge ${applications.pending > 0 ? 'alert' : 'success'}`}>
              {applications.pending > 0 ? `${applications.pending} Chờ duyệt` : 'Đã duyệt hết'}
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{applications.pending}</div>
            <div className="admin-kpi-label">Đơn ứng tuyển giảng viên</div>
          </div>
          <div className="admin-kpi-footer">
            <span>
              {applications.approved} Đã duyệt · {applications.rejected} Từ chối
            </span>
            <span>Xét duyệt →</span>
          </div>
        </div>

        <div
          className="admin-kpi-card"
          onClick={() => navigate('/admin/moderation')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon emerald">🛡️</div>
            <span className={`admin-kpi-badge ${courses.PENDING_REVIEW > 0 ? 'alert' : 'info'}`}>
              {courses.PENDING_REVIEW > 0 ? `${courses.PENDING_REVIEW} Chờ duyệt` : 'Sạch sẽ'}
            </span>
          </div>
          <div>
            <div className="admin-kpi-value">{courses.PENDING_REVIEW || 0}</div>
            <div className="admin-kpi-label">Khóa học chờ kiểm duyệt</div>
          </div>
          <div className="admin-kpi-footer">
            <span>{courses.PUBLIC || 0} Đã phát hành</span>
            <span>Kiểm duyệt →</span>
          </div>
        </div>

        <div
          className="admin-kpi-card"
          onClick={() => navigate('/admin/categories')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-kpi-top">
            <div className="admin-kpi-icon blue">🏷️</div>
            <span className="admin-kpi-badge info">Đang dùng</span>
          </div>
          <div>
            <div className="admin-kpi-value">{categories.total || 0}</div>
            <div className="admin-kpi-label">Danh mục khóa học</div>
          </div>
          <div className="admin-kpi-footer">
            <span>Cấu hình & phân loại môn</span>
            <span>Quản lý →</span>
          </div>
        </div>
      </section>

      <section className="admin-shortcuts-card">
        <div className="admin-shortcuts-title">
          <span>⚡ Phím tắt tác vụ nhanh</span>
        </div>
        <div className="admin-shortcuts-links">
          <Link to="/admin/teacher-applications" className="admin-shortcut-btn primary">
            👨‍🏫 Duyệt đơn giảng viên {applications.pending > 0 && `(${applications.pending})`}
          </Link>
          <Link to="/admin/moderation" className="admin-shortcut-btn primary">
            🛡️ Kiểm duyệt khóa học {courses.PENDING_REVIEW > 0 && `(${courses.PENDING_REVIEW})`}
          </Link>
          <Link to="/admin/categories" className="admin-shortcut-btn secondary">
            🏷️ Thêm & Sửa Danh mục
          </Link>
        </div>
      </section>

      <section className="admin-split-grid">
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Đơn ứng tuyển giáo viên mới</h3>
              <span className={`admin-panel-count ${applications.pending > 0 ? 'alert' : ''}`}>
                {applications.pending} chờ xử lý
              </span>
            </div>
            <Link to="/admin/teacher-applications" className="admin-panel-viewall">
              Xem tất cả →
            </Link>
          </div>
          <div className="admin-panel-list">
            {recentApps.length === 0 ? (
              <div className="admin-empty-panel">
                <span className="admin-empty-icon">🎉</span>
                <p>Không có đơn ứng tuyển nào đang chờ duyệt!</p>
              </div>
            ) : (
              recentApps.map((app) => (
                <div className="admin-panel-item" key={app._id}>
                  <div className="admin-item-info">
                    <div className="admin-item-avatar">
                      {(app.userId?.fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-item-meta">
                      <strong>{app.userId?.fullName || 'Ứng viên'}</strong>
                      <span>
                        {app.userId?.email || 'Chưa có email'} ·{' '}
                        {app.bio ? app.bio.slice(0, 38) + '…' : 'Chưa có tiểu sử'}
                      </span>
                    </div>
                  </div>
                  <div className="admin-item-action">
                    <Link to="/admin/teacher-applications" className="admin-quick-action-btn">
                      Xem xét
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Khóa học chờ kiểm duyệt</h3>
              <span className={`admin-panel-count ${courses.PENDING_REVIEW > 0 ? 'alert' : ''}`}>
                {courses.PENDING_REVIEW || 0} bài chờ
              </span>
            </div>
            <Link to="/admin/moderation" className="admin-panel-viewall">
              Xem hàng chờ →
            </Link>
          </div>
          <div className="admin-panel-list">
            {recentCourses.length === 0 ? (
              <div className="admin-empty-panel">
                <span className="admin-empty-icon">✨</span>
                <p>Tất cả khóa học đã được duyệt hoặc chưa có bài mới!</p>
              </div>
            ) : (
              recentCourses.map((course) => (
                <div className="admin-panel-item" key={course._id}>
                  <div className="admin-item-info">
                    <div
                      className="admin-item-avatar"
                      style={{ background: '#d1fae5', color: '#059669' }}
                    >
                      📚
                    </div>
                    <div className="admin-item-meta">
                      <strong>{course.title}</strong>
                      <span>
                        GV: {course.teacherId?.fullName || 'Chưa rõ'} ·{' '}
                        {course.category || 'Môn học'}
                      </span>
                    </div>
                  </div>
                  <div className="admin-item-action">
                    <Link to="/admin/moderation" className="admin-quick-action-btn">
                      Duyệt ngay
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="admin-analytics-grid">
        <div className="admin-chart-card">
          <div className="admin-chart-title">
            <span>Cơ cấu người dùng nền tảng</span>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              Tổng: {users.total} thành viên
            </span>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Học viên (Students)</span>
              <span>
                {users.students} ({studentPct}%)
              </span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill purple" style={{ width: `${studentPct}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Giảng viên (Teachers)</span>
              <span>
                {users.teachers} ({teacherPct}%)
              </span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill emerald" style={{ width: `${teacherPct}%` }}></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Quản trị viên (Admins)</span>
              <span>
                {users.admins} ({adminPct}%)
              </span>
            </div>
            <div className="admin-stat-bar">
              <div className="admin-stat-fill blue" style={{ width: `${adminPct}%` }}></div>
            </div>
          </div>
        </div>

        <div className="admin-chart-card">
          <div className="admin-chart-title">
            <span>Vòng đời khóa học trên AI-LMS</span>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              Tổng: {courses.total || 0} khóa
            </span>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Đã phát hành công khai</span>
              <span>
                {courses.PUBLIC || 0} ({publishedCoursesPct}%)
              </span>
            </div>
            <div className="admin-stat-bar">
              <div
                className="admin-stat-fill emerald"
                style={{ width: `${publishedCoursesPct}%` }}
              ></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Đang chờ duyệt (Pending)</span>
              <span>
                {courses.PENDING_REVIEW || 0} ({pendingCoursesPct}%)
              </span>
            </div>
            <div className="admin-stat-bar">
              <div
                className="admin-stat-fill amber"
                style={{ width: `${pendingCoursesPct}%` }}
              ></div>
            </div>
          </div>

          <div className="admin-stat-row">
            <div className="admin-stat-header">
              <span>Bản nháp của giảng viên (Draft)</span>
              <span>
                {courses.DRAFT || 0} ({draftCoursesPct}%)
              </span>
            </div>
            <div className="admin-stat-bar">
              <div
                className="admin-stat-fill purple"
                style={{ width: `${draftCoursesPct}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {recentUsers.length > 0 && (
        <section className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title">
              <h3>Tài khoản đăng ký gần đây</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="admin-recent-users-table">
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
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
                      <span
                        className={`status-badge status-${u.status === 'active' ? 'open' : 'draft'}`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '12px' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
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
