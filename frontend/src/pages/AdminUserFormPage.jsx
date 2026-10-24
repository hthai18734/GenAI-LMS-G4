import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../features/admin/api.js';
import { useToast } from '../components/Toast';
import PasswordInput from '../components/PasswordInput';

export default function AdminUserFormPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(''); setFieldErrors({});
      if (!userId) { setForm({ fullName: '', email: '', phone: '', password: '', role: 'student' }); setLoading(false); return; }
      setLoading(true);
      try {
        const res = await adminService.getUser(userId);
        if (!cancelled) setForm({ fullName: res.data.user.fullName, email: res.data.user.email, phone: res.data.user.phone || '' });
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, reload]);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setFieldErrors({});
    try {
      const data = { fullName: form.fullName, email: form.email, phone: form.phone };
      const res = userId ? await adminService.updateUser(userId, data) : await adminService.createUser({ ...data, password: form.password, role: form.role });
      addToast(res.message, 'success'); navigate(`/admin/users/${res.data.user._id}`);
    } catch (err) { setFieldErrors(err.errors || {}); addToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return <section className="management-page">
    <div className="management-header"><h1>{userId ? 'Update User' : 'Create User'}</h1><Link to="/admin/users">Back to users</Link></div>
    {loading ? <div className="spinner" /> : error ? <div className="page-error">{error}<button className="ghost" onClick={() => setReload(reload + 1)}>Retry</button></div> :
      <form className="management-card course-form" onSubmit={submit}>
        <label>Full name *<input required maxLength={50} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />{fieldErrors.fullName && <small>{fieldErrors.fullName}</small>}</label>
        <label>Email *<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />{fieldErrors.email && <small>{fieldErrors.email}</small>}</label>
        <label>Phone<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />{fieldErrors.phone && <small>{fieldErrors.phone}</small>}</label>
        {!userId && <>
          <label>Password *<PasswordInput autoComplete="new-password" required minLength={8} maxLength={15} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><span className="image-help">8–15 characters, including uppercase, lowercase, a number and a special character.</span>{fieldErrors.password && <small>{fieldErrors.password}</small>}</label>
          <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{['student', 'teacher', 'admin'].map((role) => <option key={role} value={role}>{role}</option>)}</select>{fieldErrors.role && <small>{fieldErrors.role}</small>}</label>
        </>}
        {fieldErrors.payload && <div className="page-error">{fieldErrors.payload}</div>}
        <div className="form-actions"><Link className="ghost" to="/admin/users">Cancel</Link><button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save User'}</button></div>
      </form>}
  </section>;
}
