import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { studentService } from '../features/student/api.js';
import { useAuth } from '../features/auth/useAuth.js';
import { useToast } from '../components/Toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    setLoading(true); setError('');
    try {
      const res = await studentService.getProfile();
      const p = res.data?.profile;
      if (p) {
        setProfile(p);
        setFullName(p.fullName || '');
        setPhone(p.phone || '');
        setAvatar(p.avatar || null);
      } else setError('Account information is unavailable.');
    } catch (err) {
      setError(err.message || 'Unable to load account information.');
      addToast(err.message || 'Unable to load your profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      addToast('Your avatar must be a JPEG, PNG, or WebP image.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Your avatar must be smaller than 5 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      addToast('Please enter your full name.', 'error');
      return;
    }

    if (trimmedName.length > 100) {
      addToast('Your name must not exceed 100 characters.', 'error');
      return;
    }

    // Clean phone number: remove spaces, dashes, dots, and convert international code
    let cleanPhone = phone.trim().replace(/[\s.-]/g, '');
    if (cleanPhone.startsWith('+84')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('84') && cleanPhone.length === 11) {
      cleanPhone = '0' + cleanPhone.slice(2);
    }

    if (cleanPhone && !/^0\d{9}$/.test(cleanPhone)) {
      addToast('Your phone number must contain exactly 10 digits and start with 0 (e.g. 0981234567).', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: trimmedName,
        phone: cleanPhone || null,
      };

      // Only send avatar if a new image was uploaded (data URI) or if it changed
      if (avatar && avatar.startsWith('data:image/')) {
        payload.avatar = avatar;
      } else if (avatar === null && profile?.avatar) {
        payload.avatar = null;
      }

      const res = await studentService.updateProfile(payload);
      const updated = res.data?.profile;
      if (updated) {
        setProfile(updated);
        setFullName(updated.fullName || '');
        setPhone(updated.phone || '');
        updateUser(updated);
        addToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      if (err.errors) {
        const errorMsg = Object.values(err.errors).join(', ');
        addToast(`Update failed: ${errorMsg}`, 'error');
      } else {
        addToast(err.message || 'Unable to update your profile.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) return <section className="management-page"><div className="page-error" role="alert">{error}<button className="ghost" onClick={fetchProfile}>Retry</button></div></section>;

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'HV';

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Not available';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 className="section-title" style={{ margin: '0 0 6px', fontSize: '22px' }}>
          Profile & Account
        </h2>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
          Manage your personal information and account details
        </p>
      </div>

      {/* Balanced 2-Column Grid */}
      <div className="profile-grid-layout">
        {/* Left Column: Summary & Avatar Card */}
        <div>
          <div className="profile-card-panel" style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 16px' }}>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #eeecff, #e0dcff)',
                  border: '3px solid #e0dcff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '34px',
                  fontWeight: 700,
                  color: 'var(--purple)',
                  overflow: 'hidden',
                  margin: 'auto',
                }}
              >
                {avatar ? (
                  <img src={avatar} alt={profile?.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <button
                type="button"
                className="avatar-upload-btn"
                title="Change avatar"
                onClick={() => fileInputRef.current?.click()}
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>

            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
              {profile?.fullName || 'Student'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 14px' }}>
              {profile?.email}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <span className="badge badge-active" style={{
                background: (profile?.role || user?.role) === 'admin' ? '#f3e8ff' : (profile?.role || user?.role) === 'teacher' ? '#fef3c7' : '#dcfce7',
                color: (profile?.role || user?.role) === 'admin' ? '#6b21a8' : (profile?.role || user?.role) === 'teacher' ? '#92400e' : '#15803d'
              }}>
                {(profile?.role || user?.role) === 'admin' ? 'Admin' : (profile?.role || user?.role) === 'teacher' ? 'Teacher' : 'Student'}
              </span>
              <span className="badge badge-completed" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                Active
              </span>
            </div>

            <div style={{ borderTop: '1px solid #f0eff9', paddingTop: '16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Joined</span>
                <strong style={{ color: 'var(--ink)' }}>{memberSince}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Email Status</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ Verified</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Role</span>
                <strong style={{ color: 'var(--ink)' }}>
                  {(profile?.role || user?.role) === 'admin' ? 'Admin' : (profile?.role || user?.role) === 'teacher' ? 'Teacher' : 'Student'}
                </strong>
              </div>
            </div>
          </div>

          <div className="side-info-card">
            <h4>
              <span>🛡️</span> Account Security
            </h4>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
              Your account is protected by authenticated security tokens. Update your password regularly to keep your learning records safe.
            </p>
            <Link
              to="/change-password"
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                border: '1px solid #ddd6fe',
                color: '#5b21b6',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <span>🔑</span> Change Password
            </Link>
          </div>
        </div>

        {/* Right Column: Detailed Edit Form */}
        <div>
          <div className="profile-card-panel">
            <h3 className="profile-card-title">
              <span>✏️</span> Edit Personal Information
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="pFullName">Full Name *</label>
                  <input
                    id="pFullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Example: Alex Morgan"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Your name appears on your profile and course completion certificates.
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="pPhone">Phone Number</label>
                  <input
                    id="pPhone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Example: 0981260124"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Used for urgent notifications or account verification.
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="pEmail">Email Address (Read-only)</label>
                  <input
                    id="pEmail"
                    type="email"
                    readOnly
                    value={profile?.email || ''}
                    style={{ background: '#f8f8fc', color: '#64748b', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Your email is used to sign in to AI-LMS.
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Account Activation Date</label>
                  <input
                    type="text"
                    readOnly
                    value={memberSince}
                    style={{ background: '#f8f8fc', color: '#64748b', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    The date you joined the platform.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #f0eff9' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ minWidth: '170px' }}
                >
                  {saving ? 'Saving changes...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="btn btn-secondary"
                >
                  Cancel / Reload
                </button>
              </div>
            </form>
          </div>

          <div className="profile-card-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ fontFamily: 'Space Grotesk', fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔐</span> Account Password & Security
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Ensure your learning account remains secure by maintaining a strong, unique password.
              </p>
            </div>
            <Link
              to="/change-password"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                padding: '9px 18px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span>🔑</span> Change Password
            </Link>
          </div>

          <div className="profile-card-panel" style={{ background: '#f8f7ff', border: '1px dashed #c7d2fe' }}>
            <h4 style={{ fontFamily: 'Space Grotesk', fontSize: '15px', fontWeight: 700, margin: '0 0 6px', color: '#4338ca' }}>
              💡 Your Name on Certificates
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
              Your full name will appear on your certificate after you complete all course lessons. Enter your name accurately as you want it to appear on your certificate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
