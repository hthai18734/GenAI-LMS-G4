import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService, clearSession } from '../features/auth/api.js';
import { useToast } from '../components/toastContext';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Real-time criteria verification
  const criteria = useMemo(() => {
    const pwd = form.newPassword;
    return {
      length: pwd.length >= 8 && pwd.length <= 15,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
    };
  }, [form.newPassword]);

  const score = useMemo(() => {
    return Object.values(criteria).filter(Boolean).length;
  }, [criteria]);

  const strengthConfig = useMemo(() => {
    if (!form.newPassword) {
      return { label: 'Not entered', color: '#cbd5e1', percent: 0 };
    }
    if (score <= 2) {
      return { label: 'Weak', color: '#ef4444', percent: 25 };
    }
    if (score <= 3) {
      return { label: 'Fair', color: '#f59e0b', percent: 55 };
    }
    if (score === 4) {
      return { label: 'Good', color: '#3b82f6', percent: 80 };
    }
    return { label: 'Strong', color: '#10b981', percent: 100 };
  }, [score, form.newPassword]);

  const isMatching = useMemo(() => {
    if (!form.confirmPassword) return null;
    return form.newPassword === form.confirmPassword;
  }, [form.newPassword, form.confirmPassword]);

  const isSameAsCurrent = useMemo(() => {
    return (
      Boolean(form.currentPassword) &&
      Boolean(form.newPassword) &&
      form.currentPassword === form.newPassword
    );
  }, [form.currentPassword, form.newPassword]);

  const isFormValid = useMemo(() => {
    return (
      form.currentPassword.trim().length > 0 &&
      score === 5 &&
      isMatching === true &&
      !isSameAsCurrent
    );
  }, [form.currentPassword, score, isMatching, isSameAsCurrent]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.currentPassword) {
      addToast('Please enter your current password.', 'error');
      return;
    }

    if (score < 5) {
      addToast('New password does not meet all security requirements.', 'error');
      return;
    }

    if (isSameAsCurrent) {
      addToast('New password must differ from your current password.', 'error');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      addToast('New passwords do not match.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await authService.changePassword(form);
      clearSession();
      sessionStorage.setItem(
        'ai_lms_auth_notice',
        res.message || 'Password changed successfully. Please sign in again with your new password.'
      );
      navigate('/login', { replace: true });
    } catch (err) {
      addToast(err.message || 'Failed to update password. Please check your current password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Breadcrumb & Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--muted)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--purple)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
        >
          <span>←</span> Back to Profile & Account
        </Link>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '24px',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.24)',
          }}
        >
          🛡️
        </div>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
            Change Password
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
            Update your account password to ensure your account and learning progress remain protected.
          </p>
        </div>
      </div>

      {/* Main Grid: Form + Info Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Password Update Form Card */}
        <div className="profile-card-panel" style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Current Password Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="currentPassword" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                Current Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  placeholder="Enter your current password"
                  style={{
                    width: '100%',
                    paddingRight: '42px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    height: '44px',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                  title={showCurrent ? 'Hide password' : 'Show password'}
                  aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                  aria-pressed={showCurrent}
                >
                  {showCurrent ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="newPassword" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={15}
                  required
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="Enter a new secure password"
                  style={{
                    width: '100%',
                    paddingRight: '42px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    height: '44px',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                  title={showNew ? 'Hide password' : 'Show password'}
                  aria-label={showNew ? 'Hide new password' : 'Show new password'}
                  aria-pressed={showNew}
                >
                  {showNew ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Strength Meter */}
              {form.newPassword && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--muted)' }}>Password strength</span>
                    <span style={{ fontWeight: 600, color: strengthConfig.color }}>{strengthConfig.label}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${strengthConfig.percent}%`,
                        height: '100%',
                        background: strengthConfig.color,
                        transition: 'all 0.3s ease',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Same as current warning */}
              {isSameAsCurrent && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️</span> New password must be different from your current password.
                </div>
              )}

              {/* Requirement Checklist */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  Password requirements
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '12px' }}>
                  <span style={{ color: criteria.length ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{criteria.length ? '✓' : '○'}</span> 8–15 characters
                  </span>
                  <span style={{ color: criteria.upper ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{criteria.upper ? '✓' : '○'}</span> 1 uppercase letter (A-Z)
                  </span>
                  <span style={{ color: criteria.lower ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{criteria.lower ? '✓' : '○'}</span> 1 lowercase letter (a-z)
                  </span>
                  <span style={{ color: criteria.number ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{criteria.number ? '✓' : '○'}</span> 1 numeric digit (0-9)
                  </span>
                  <span style={{ color: criteria.special ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{criteria.special ? '✓' : '○'}</span> 1 special symbol (!@#$...)
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="confirmPassword" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-enter your new password"
                  style={{
                    width: '100%',
                    paddingRight: '42px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    height: '44px',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                  title={showConfirm ? 'Hide password' : 'Show password'}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirm}
                >
                  {showConfirm ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Match Feedback Badge */}
              {isMatching !== null && (
                <div style={{ marginTop: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isMatching ? (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Passwords match</span>
                  ) : (
                    <span style={{ color: '#ef4444' }}>⚠️ Passwords do not match</span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="submit"
                disabled={saving || !isFormValid}
                className="btn btn-primary"
                style={{
                  minWidth: '180px',
                  height: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  opacity: !isFormValid && !saving ? 0.6 : 1,
                  cursor: !isFormValid && !saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? (
                  <span>Saving new password...</span>
                ) : (
                  <>
                    <span>🔐</span>
                    <span>Update Password</span>
                  </>
                )}
              </button>
              <Link
                to="/profile"
                className="btn btn-secondary"
                style={{
                  height: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 20px',
                  textDecoration: 'none',
                }}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Right Column: Security Guidance Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Security Best Practices */}
          <div className="side-info-card" style={{ margin: 0 }}>
            <h4 style={{ color: '#4338ca' }}>
              <span>💡</span> Password Best Practices
            </h4>
            <ul style={{ margin: '0 0 10px', paddingLeft: '18px', fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
              <li>Avoid reusing passwords from personal email or other platforms.</li>
              <li>Do not include common names, dictionary words, or birth dates.</li>
              <li>A mix of upper, lower, numbers, and symbols protects against automated dictionary attacks.</li>
            </ul>
          </div>

          {/* Session Invalidation Notice */}
          <div className="side-info-card" style={{ margin: 0, background: '#fefce8', borderColor: '#fef08a' }}>
            <h4 style={{ color: '#854d0e' }}>
              <span>🔄</span> Active Sessions Notice
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#713f12', lineHeight: 1.5 }}>
              For security, after your password is changed, all active browser sessions on all devices will be automatically revoked. You will be prompted to sign in again immediately.
            </p>
          </div>

          {/* Quick Help Card */}
          <div className="side-info-card" style={{ margin: 0 }}>
            <h4>
              <span>❓</span> Forgot Current Password?
            </h4>
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
              If you don't remember your current password, you can request an email reset from the login screen.
            </p>
            <Link
              to="/request-password-reset"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--purple)',
                textDecoration: 'none',
              }}
            >
              Request Password Reset →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
