import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../features/auth/api.js';
import { useToast } from '../components/toastContext';

export default function RequestPasswordResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { addToast } = useToast();
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setMessage('');
    try { const res = await authService.requestPasswordReset(email.trim()); setMessage(res.message); }
    catch (err) { addToast(err.message, 'error'); }
    finally { setLoading(false); }
  };
  return <main className="auth-page"><section className="auth-card card">
    <h1 className="page-title">Forgot password?</h1><p className="subtitle">Enter your email to receive a password reset link.</p>
    {message && <p role="status">{message}</p>}
    <form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="primary full" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button></form>
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </section></main>;
}
