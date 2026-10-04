import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useToast } from '../components/Toast';

export default function OtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [email] = useState(() => {
    return location.state?.email || sessionStorage.getItem('ai_lms_pending_email') || '';
  });
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[index]) {
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    const targetIndex = Math.min(pasted.length, 5);
    inputRefs.current[targetIndex]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < 6) {
      addToast('Please enter the complete 6-digit OTP.', 'error');
      const firstEmpty = digits.findIndex((d) => !d);
      if (firstEmpty !== -1) inputRefs.current[firstEmpty]?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyOtp({ email: email.trim().toLowerCase(), otp });
      sessionStorage.removeItem('ai_lms_pending_email');
      sessionStorage.setItem(
        'ai_lms_auth_notice',
        res.message || 'Email verified successfully. Please sign in.',
      );
      addToast('Email verified successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      addToast(err.message || 'Failed to verify OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0 || resending) return;

    setResending(true);
    try {
      await authService.resendOtp({ email: email.trim().toLowerCase() });
      addToast('A new OTP was sent to your email.', 'success');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setCooldown(60);
    } catch (err) {
      addToast(err.message || 'Failed to resend code.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-page otp-page">
      <header className="auth-brand">
        <div className="brand-logo">
          <img src="/assets/images/logo.jpg" alt="" />
        </div>
        <div className="brand-name">AI-LMS</div>
      </header>

      <section className="auth-card otp-card card" aria-labelledby="page-title">
        <div className="otp-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="3"></rect>
            <path d="m4 7 8 6 8-6"></path>
          </svg>
        </div>

        <h1 className="page-title otp-title" id="page-title">
          Verify your email
        </h1>
        <p className="subtitle otp-subtitle">
          Enter the 6-digit code sent to
          <br />
          <strong id="verification-email">{email}</strong>
        </p>

        <form onSubmit={handleVerify} data-mode="verify">
          <fieldset className="otp-field">
            <legend className="sr-only">6-digit verification code</legend>
            <div
              className="otp-inputs"
              role="group"
              aria-label="6-digit verification code"
              onPaste={handlePaste}
            >
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  className="otp-box"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digits[idx]}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onFocus={(e) => e.target.select()}
                  required
                />
              ))}
              <span className="otp-dash" aria-hidden="true"></span>
              {[3, 4, 5].map((idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  className="otp-box"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digits[idx]}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onFocus={(e) => e.target.select()}
                  required
                />
              ))}
            </div>
          </fieldset>

          <p className="otp-hint">The code expires in 5 minutes.</p>

          <button className="primary full" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : 'Verify code'}
          </button>
        </form>

        <p className="otp-resend">
          Didn't get the code?{' '}
          <button
            className="otp-link"
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            style={{ opacity: cooldown > 0 ? 0.6 : 1 }}
          >
            {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
          </button>
        </p>

        <p className="auth-switch">
          <Link to="/register">&larr; Back to registration</Link>
        </p>
      </section>
    </main>
  );
}
