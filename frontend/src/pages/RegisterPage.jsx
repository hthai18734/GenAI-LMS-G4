import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import { authService } from '../features/auth/api.js';
import { useToast } from '../components/Toast';

export default function RegisterPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const googleRegistrationRequired = params.get('reason') === 'google_registration_required';
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: googleRegistrationRequired ? (params.get('email') || '') : '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fullNameTrimmed = formData.fullName.trim();
    if (!fullNameTrimmed || fullNameTrimmed.split(/\s+/).length < 2) {
      addToast('Please enter your full name with at least two words.', 'error');
      return;
    }

    if (!formData.phone || !/^(0[35789])\d{8}$/.test(formData.phone.trim())) {
      addToast('Invalid phone number format (e.g. 0912345678).', 'error');
      return;
    }

    if (formData.password.length < 8 || formData.password.length > 15) {
      addToast('Password must be 8–15 characters long.', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const emailClean = formData.email.trim().toLowerCase();
      await authService.register({
        fullName: fullNameTrimmed,
        phone: formData.phone.trim(),
        email: emailClean,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      sessionStorage.setItem('ai_lms_pending_email', emailClean);
      sessionStorage.setItem('ai_lms_auth_notice', 'A verification code was sent to your email.');
      addToast('A verification code was sent to your email.', 'success');
      navigate('/verify-otp', { state: { email: emailClean } });
    } catch (err) {
      addToast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
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
          Create your AI-LMS account
        </h1>
        <p className="subtitle">Your account will be activated after OTP verification.</p>
        {googleRegistrationRequired && (
          <p className="page-error" role="alert">
            No account exists for this Google email. Register with your email and a password, then verify your email with OTP. You can sign in with Google after completing registration.
          </p>
        )}

        <form onSubmit={handleSubmit} data-mode="register">
          <label>
            Full name <span className="required-mark" aria-hidden="true">*</span>
            <input
              name="fullName"
              autoComplete="name"
              required
              placeholder="Nguyen Van A"
              value={formData.fullName}
              onChange={handleChange}
            />
          </label>

          <label>
            Phone <span className="required-mark" aria-hidden="true">*</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              placeholder="0912345678"
              value={formData.phone}
              onChange={handleChange}
            />
          </label>

          <label>
            Email <span className="required-mark" aria-hidden="true">*</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </label>

          <label>
            Password <span className="required-mark" aria-hidden="true">*</span>
            <PasswordInput
              name="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={15}
              required
              value={formData.password}
              onChange={handleChange}
            />
          </label>

          <label>
            Confirm password <span className="required-mark" aria-hidden="true">*</span>
            <PasswordInput
              name="confirmPassword"
              autoComplete="new-password"
              minLength={8}
              maxLength={15}
              required
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </label>

          <button className="primary full" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : 'Send verification code'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
