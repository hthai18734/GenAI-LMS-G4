import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';
import { studentService } from '../features/student/api.js';
import { useToast } from './toastContext';

export default function TeacherSuspendedNotice() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [checking, setChecking] = useState(false);

  const handleRefreshStatus = async () => {
    setChecking(true);
    try {
      const res = await studentService.getProfile();
      const profile = res.data?.profile;
      if (profile) {
        updateUser({ ...user, teachingStatus: profile.teachingStatus || 'active' });
        if (profile.teachingStatus !== 'suspended') {
          addToast('Your teaching access has been restored. Reloading...', 'success');
          window.location.reload();
        } else {
          addToast('Your account is still suspended.', 'info');
        }
      }
    } catch {
      addToast('Unable to check your status right now. Please try again later.', 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'var(--bg, #f8fafc)',
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: 'var(--surface, #ffffff)',
        borderRadius: '20px',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
        border: '1px solid var(--line, #e2e8f0)',
        padding: '40px 36px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Warning Accent Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
        }} />

        {/* Warning Icon Badge */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'rgba(239, 68, 68, 0.08)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '36px',
          border: '1px solid rgba(239, 68, 68, 0.15)'
        }}>
          ⚠️
        </div>

        {/* Status Pill */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
            Status: Teaching suspended
          </span>
        </div>

        <h1 style={{
          fontSize: '26px',
          fontWeight: 800,
          color: 'var(--text, #0f172a)',
          marginBottom: '12px',
          letterSpacing: '-0.02em'
        }}>
          Teaching Access Suspended
        </h1>

        <p style={{
          fontSize: '15px',
          color: 'var(--text-dim, #64748b)',
          lineHeight: '1.6',
          maxWidth: '480px',
          margin: '0 auto 32px'
        }}>
          Teaching access for <strong>{user?.fullName || user?.email}</strong> has been suspended by a system administrator. Check your notifications or contact an administrator for details.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRefreshStatus}
            disabled={checking}
            className="btn btn-primary"
            style={{
              padding: '10px 22px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {checking ? 'Checking...' : '🔄 Check status again'}
          </button>

          <Link
            to="/notifications"
            className="btn btn-secondary"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔔 View notifications
          </Link>

          <Link
            to="/profile"
            className="btn btn-secondary"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            👤 My profile
          </Link>

          <Link
            to="/"
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              color: 'var(--text-dim, #64748b)',
              textDecoration: 'none',
              alignSelf: 'center'
            }}
          >
            Back to home →
          </Link>
        </div>
      </div>
    </div>
  );
}

