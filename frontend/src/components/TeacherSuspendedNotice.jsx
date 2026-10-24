import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';
import { studentService } from '../features/student/api.js';
import { useToast } from './Toast';

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
          addToast('Quyền giảng dạy của bạn đã được khôi phục! Đang tải lại...', 'success');
          window.location.reload();
        } else {
          addToast('Tài khoản vẫn đang trong trạng thái tạm đình chỉ.', 'info');
        }
      }
    } catch {
      addToast('Không thể kiểm tra trạng thái lúc này. Vui lòng thử lại sau.', 'error');
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
            Trạng thái: Tạm đình chỉ giảng dạy
          </span>
        </div>

        <h1 style={{
          fontSize: '26px',
          fontWeight: 800,
          color: 'var(--text, #0f172a)',
          marginBottom: '12px',
          letterSpacing: '-0.02em'
        }}>
          Quyền Giảng Dạy Đang Tạm Khóa
        </h1>

        <p style={{
          fontSize: '15px',
          color: 'var(--text-dim, #64748b)',
          lineHeight: '1.6',
          maxWidth: '480px',
          margin: '0 auto 32px'
        }}>
          Tài khoản giảng viên <strong>{user?.fullName || user?.email}</strong> đã bị tạm ngừng các quyền giảng dạy bởi quản trị viên hệ thống. Vui lòng kiểm tra mục thông báo hoặc liên hệ quản trị viên để biết thêm chi tiết.
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
            {checking ? 'Đang kiểm tra...' : '🔄 Kiểm tra lại trạng thái'}
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
            🔔 Xem thông báo
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
            👤 Hồ sơ của tôi
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
            Về trang chủ →
          </Link>
        </div>
      </div>
    </div>
  );
}

