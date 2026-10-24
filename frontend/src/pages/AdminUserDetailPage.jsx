import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../features/admin/api.js';
import { useAuth } from '../features/auth/useAuth.js';
import { useToast } from '../components/Toast';

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const isSelf = String(currentUser?.id || currentUser?._id) === userId;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const res = await adminService.getUser(userId);
        if (!cancelled) { setUser(res.data.user); setRole(res.data.user.role); }
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, reload]);

  const changeRole = async (event) => {
    event.preventDefault(); setSaving(true);
    try { const res = await adminService.updateUserRole(userId, role); addToast(res.message, 'success'); setReload(reload + 1); }
    catch (err) { addToast(err.message, 'error'); }
    finally { setSaving(false); }
  };
  const changeStatus = async () => {
    const status = user.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`${status === 'inactive' ? 'Deactivate' : 'Activate'} ${user.email}?`)) return;
    setSaving(true);
    try { const res = await adminService.updateUserStatus(userId, status); addToast(res.message, 'success'); setReload(reload + 1); }
    catch (err) { addToast(err.message, 'error'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${user.email}? This permanently removes the user account.`)) return;
    setSaving(true);
    try { const res = await adminService.deleteUser(userId); addToast(res.message, 'success'); navigate('/admin/users'); }
    catch (err) { addToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return <section className="management-page">
    <div className="management-header"><h1>Account & User Detail</h1><Link to="/admin/users">Back to users</Link></div>
    {loading ? <div className="spinner" /> : error ? <div className="page-error">{error}<button className="ghost" onClick={() => setReload(reload + 1)}>Retry</button></div> : user && <div className="management-card course-form">
      <dl className="review-details">
        <div><dt>Name</dt><dd>{user.fullName}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Phone</dt><dd>{user.phone || 'Not provided'}</dd></div><div><dt>Role</dt><dd>{user.role}</dd></div><div><dt>Status</dt><dd>{user.status}</dd></div><div><dt>Created</dt><dd>{new Date(user.createdAt).toLocaleString('en-US')}</dd></div><div><dt>Last login</dt><dd>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-US') : 'Never'}</dd></div>
      </dl>
      <form onSubmit={changeRole}><label>Role<select disabled={saving || isSelf} value={role} onChange={(event) => setRole(event.target.value)}>{['student', 'teacher', 'admin'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><div className="form-actions"><button className="primary" disabled={saving || isSelf || role === user.role}>Change Role</button></div></form>
      <div className="form-actions"><Link className="ghost" to={`/admin/users/${userId}/edit`}>Edit User</Link>{user.role !== 'admin' && user.status !== 'pending' && <button className="ghost" disabled={saving} onClick={changeStatus}>{user.status === 'active' ? 'Deactivate' : 'Activate'}</button>}<button className="danger-button" disabled={saving || isSelf} onClick={remove}>Delete User</button></div>
    </div>}
  </section>;
}
