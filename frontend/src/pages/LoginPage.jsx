import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { authService } from '../services/api';
import { useToast } from '../components/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'teacher' ? '/teacher/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    if (errorParam) {
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
      addToast('Vui lòng nhập đầy đủ email và mật khẩu.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login(email.trim(), password);
      if (res.data) {
        login(res.data);
        addToast('Đăng nhập thành công! Chào mừng bạn trở lại.', 'success');
        navigate(res.data.user?.role === 'teacher' ? '/teacher/dashboard' : res.data.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
      }
    } catch (err) {
      addToast(err.message || 'Email hoặc mật khẩu không chính xác.', 'error');
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
            <input
              name="password"
              type="password"
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
          Need an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  );
}
