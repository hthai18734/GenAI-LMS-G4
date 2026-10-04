import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/api';
import { useToast } from '../components/Toast';

export default function AdminDashboardPage() {
  const { addToast } = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    adminService.getDashboard()
      .then((result) => setData(result.data || {}))
      .catch((error) => addToast(error.message || 'Không thể tải dashboard.', 'error'));
  }, []);

  const users = data?.metrics?.users || { total: 0, students: 0, teachers: 0, admins: 0 };
  const courses = data?.metrics?.courses || { total: 0, PENDING_REVIEW: 0 };
  const categories = data?.metrics?.categories || { total: 0 };
  const cards = [
    ['Tổng người dùng', users.total, 'Tạo/cấp role tài khoản', '/admin/users'],
    ['Giảng viên', users.teachers, 'Quản lý role Teacher', '/admin/users'],
    ['Khóa học chờ duyệt', courses.PENDING_REVIEW, 'Mở hàng đợi kiểm duyệt', '/admin/moderation'],
    ['Danh mục', categories.total, 'Quản lý danh mục', '/admin/categories'],
  ];

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>
      <h1>Dashboard quản trị</h1>
      <p style={{ color: 'var(--text-dim)' }}>Quản trị viên tạo trực tiếp tài khoản và cấp quyền giảng viên.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 24 }}>
        {cards.map(([label, value, action, to]) => <Link key={label} to={to} style={{ color: 'inherit', textDecoration: 'none', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
          <small style={{ color: 'var(--text-dim)' }}>{label}</small><div style={{ fontSize: 32, fontWeight: 700, margin: '8px 0' }}>{value}</div><span style={{ color: 'var(--primary)' }}>{action} →</span>
        </Link>)}
      </div>
      <section style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Người dùng mới</h2>
        {(data?.recentUsers || []).map((user) => <div key={user._id} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', padding: '12px 0' }}><span>{user.fullName} <small>({user.email})</small></span><strong>{user.role}</strong></div>)}
        {!data?.recentUsers?.length && <p style={{ color: 'var(--text-dim)' }}>Chưa có dữ liệu.</p>}
      </section>
    </div>
  );
}
