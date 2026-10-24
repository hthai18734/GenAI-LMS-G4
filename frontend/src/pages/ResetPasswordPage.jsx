import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService, clearSession } from '../features/auth/api.js';
import { useToast } from '../components/Toast';

import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) { addToast('Passwords do not match.', 'error'); return; }
    setLoading(true);
    try { const res = await authService.resetPassword({ token, newPassword, confirmPassword }); clearSession(); sessionStorage.setItem('ai_lms_auth_notice', res.message); navigate('/login', { replace: true }); }
    catch (err) { addToast(err.message, 'error'); }
    finally { setLoading(false); }
  };
  return <main className="auth-page"><section className="auth-card card"><h1 className="page-title">Reset password</h1><p className="subtitle">Use 8-15 characters with uppercase, lowercase, a number and a special character.</p>
    {!token ? <p className="page-error">Reset link is missing a token. <Link to="/request-password-reset">Request a new link</Link></p> : <form onSubmit={submit}>
      <label>New password<PasswordInput autoComplete="new-password" required minLength={8} maxLength={15} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
      <label>Confirm password<PasswordInput autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      <button className="primary full" disabled={loading}>{loading ? 'Saving...' : 'Reset password'}</button>
    </form>}<p className="auth-switch"><Link to="/request-password-reset">Request a new reset link</Link></p>
  </section></main>;
}
