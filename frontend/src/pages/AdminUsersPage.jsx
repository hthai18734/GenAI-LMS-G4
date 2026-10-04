import React, { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/Toast';

const emptyForm = { fullName: '', email: '', password: '', phone: '', role: 'teacher' };

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const result = await adminService.getUsers(filter ? { role: filter } : {});
      setUsers(result.data?.users || []);
    } catch (error) {
      addToast(error.message || 'Không thể tải danh sách người dùng.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, [filter]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminService.createUser(form);
      addToast('Đã tạo tài khoản và cấp role thành công.', 'success');
      setForm(emptyForm);
      await loadUsers();
    } catch (error) {
      addToast(error.message || 'Không thể tạo tài khoản.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(account, role) {
    if (account.id === currentUser?.id || account._id === currentUser?._id) {
      addToast('Không thể thay đổi role của chính bạn.', 'error');
      return;
    }
    try {
      await adminService.updateUserRole(account.id || account._id, role);
      addToast('Đã cập nhật role người dùng.', 'success');
      await loadUsers();
    } catch (error) {
      addToast(error.message || 'Không thể cập nhật role.', 'error');
    }
  }

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 24px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Quản lý người dùng</h1>
        <p style={{ color: 'var(--text-dim)' }}>Admin trực tiếp tạo tài khoản và cấp quyền Giảng viên, không cần luồng nộp đơn.</p>
      </header>

      <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 22, marginBottom: 28 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Tạo tài khoản mới</h2>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          <label>Họ tên<input required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Mật khẩu<input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Số điện thoại<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="teacher">Teacher</option><option value="student">Student</option></select></label>
          <div style={{ alignSelf: 'end' }}><button className="btn btn-primary" disabled={saving}>{saving ? 'Đang tạo…' : 'Tạo tài khoản'}</button></div>
        </form>
      </section>

      <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Danh sách người dùng</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Lọc role">
            <option value="">Tất cả role</option><option value="teacher">Teacher</option><option value="student">Student</option><option value="admin">Admin</option>
          </select>
        </div>
        {loading ? <p>Đang tải…</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th align="left">Người dùng</th><th align="left">Email</th><th align="left">Role</th><th align="left">Ngày tạo</th></tr></thead>
              <tbody>{users.map((account) => (
                <tr key={account.id || account._id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 4px' }}>{account.fullName}</td><td>{account.email}</td>
                  <td><select value={account.role} disabled={account.role === 'admin' || String(account.id || account._id) === String(currentUser?.id || currentUser?._id)} onChange={(e) => changeRole(account, e.target.value)}><option value="student">Student</option><option value="teacher">Teacher</option></select></td>
                  <td>{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
            {!users.length && <p style={{ color: 'var(--text-dim)' }}>Chưa có người dùng phù hợp.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
