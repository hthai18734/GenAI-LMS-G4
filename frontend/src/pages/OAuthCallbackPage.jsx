import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, getToken } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/Toast';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addToast } = useToast();
  const executedRef = useRef(false);

  useEffect(() => {
    // Prevent double invocation in React StrictMode
    if (executedRef.current) return;
    executedRef.current = true;

    const handleExchange = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const oauthError = params.get('error');

      if (oauthError) {
        addToast(oauthError, 'error');
        navigate('/login', { replace: true });
        return;
      }

      if (!code) {
        if (getToken()) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
        return;
      }

      try {
        const res = await authService.exchangeGoogleCode(code);
        if (res.data) {
          login(res.data);
          addToast('Signed in with Google successfully!', 'success');
          navigate(res.data.user?.role === 'teacher' ? '/teacher/dashboard' : res.data.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
        } else {
          throw new Error('No user data returned.');
        }
      } catch (err) {
        // If already authenticated by concurrent call, proceed to dashboard
        if (getToken()) {
          navigate('/dashboard', { replace: true });
          return;
        }
        addToast(err.message || 'Google sign-in failed. Please try again.', 'error');
        navigate('/login', { replace: true });
      }
    };

    handleExchange();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '16px', color: 'var(--muted)', fontSize: '15px', fontWeight: 500 }}>
          Authenticating with Google...
        </p>
      </div>
    </div>
  );
}
