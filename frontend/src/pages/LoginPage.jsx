import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';
import { authService, clearSession } from '../features/auth/api.js';
import { useToast } from '../components/toastContext';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const noticeSearchRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && !new URLSearchParams(location.search).has('error')) {
      navigate(user?.role === 'teacher' ? '/teacher/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, user, location.search]);

  useEffect(() => {
    if (noticeSearchRef.current === location.search) return;
    noticeSearchRef.current = location.search;
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      clearSession();
      addToast(errorParam, 'error');
    }
    const notice = sessionStorage.getItem('ai_lms_auth_notice');
    if (notice) {
      sessionStorage.removeItem('ai_lms_auth_notice');
      addToast(notice, 'success');
    }
  }, [location.search, addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter your email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login(email.trim(), password);
      if (res.data) {
        login(res.data);
        addToast('Signed in successfully! Welcome back.', 'success');
        navigate(res.data.user?.role === 'teacher' ? '/teacher/dashboard' : res.data.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.errors?.requiresEmailVerification) {
        const pendingEmail = err.errors.email;
        sessionStorage.setItem('ai_lms_pending_email', pendingEmail);
        addToast(err.message, 'info');
        navigate('/verify-otp', { state: { email: pendingEmail } });
        return;
      }
      addToast(err.message || 'Incorrect email or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await authService.getGoogleUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      addToast(err.message || 'Failed to initialize Google login.', 'error');
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-brand">
        <div className="brand-logo">
          <img src="/assets/images/logo.jpg" alt="" />
        </div>
        <div className="brand-name">AI-LMS</div>
      </header>

      <section className="auth-card card" aria-labelledby="page-title">
        <h1 className="page-title" id="page-title">
          Welcome back
        </h1>
        <p className="subtitle">Sign in to continue to your AI-LMS account.</p>

        <form onSubmit={handleSubmit} data-mode="login">
          <label>
            Email <span className="required-mark" aria-hidden="true">*</span>
            <input
              name="email"
              type="text"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password <span className="required-mark" aria-hidden="true">*</span>
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="primary full" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : 'Sign in'}
          </button>
        </form>

        <button
          className="ghost full google"
          id="google-button"
          type="button"
          onClick={handleGoogleLogin}
        >
          Continue with Google
        </button>

        <p className="auth-switch">
          <Link to="/request-password-reset">Forgot password?</Link>
        </p>
        <p className="auth-switch">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  );
}
