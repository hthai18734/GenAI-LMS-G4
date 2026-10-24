import React, { useEffect, useState, useRef } from 'react';
import { studentService } from '../services/api';
import { useAuth } from '../services/AuthContext';
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

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await studentService.getProfile();
      const p = res.data?.profile;
      if (p) {
        setProfile(p);
        setFullName(p.fullName || '');
        setPhone(p.phone || '');
        setAvatar(p.avatar || null);
      }
    } catch (err) {
      addToast(err.message || 'Không thể tải thông tin hồ sơ.', 'error');
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
      addToast('Ảnh đại diện phải có định dạng JPEG, PNG hoặc WebP.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Dung lượng ảnh đại diện phải nhỏ hơn 5MB.', 'error');
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
      addToast('Vui lòng nhập họ và tên.', 'error');
      return;
    }

    if (trimmedName.length > 100) {
      addToast('Tên không được vượt quá 100 ký tự.', 'error');
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
      addToast('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0 (ví dụ: 0981234567).', 'error');
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
        addToast('Cập nhật hồ sơ cá nhân thành công!', 'success');
      }
    } catch (err) {
      if (err.errors) {
        const errorMsg = Object.values(err.errors).join(', ');
        addToast(`Cập nhật thất bại: ${errorMsg}`, 'error');
      } else {
        addToast(err.message || 'Cập nhật hồ sơ thất bại.', 'error');
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
    ? new Date(profile.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Chưa cập nhật';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 className="section-title" style={{ margin: '0 0 6px', fontSize: '22px' }}>
          Hồ sơ cá nhân & Tài khoản
        </h2>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
          Quản lý thông tin định danh và cập nhật chi tiết tài khoản học viên của bạn
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
                title="Thay đổi ảnh đại diện"
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
              {profile?.fullName || 'Học viên'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 14px' }}>
              {profile?.email}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <span className="badge badge-active" style={{
                background: (profile?.role || user?.role) === 'admin' ? '#f3e8ff' : (profile?.role || user?.role) === 'teacher' ? '#fef3c7' : '#dcfce7',
                color: (profile?.role || user?.role) === 'admin' ? '#6b21a8' : (profile?.role || user?.role) === 'teacher' ? '#92400e' : '#15803d'
              }}>
                {(profile?.role || user?.role) === 'admin' ? 'Quản trị viên' : (profile?.role || user?.role) === 'teacher' ? 'Giảng viên' : 'Học viên'}
              </span>
              <span className="badge badge-completed" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                Đang hoạt động
              </span>
            </div>

            <div style={{ borderTop: '1px solid #f0eff9', paddingTop: '16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Ngày tham gia</span>
                <strong style={{ color: 'var(--ink)' }}>{memberSince}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Trạng thái Email</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ Đã xác thực</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Vai trò</span>
                <strong style={{ color: 'var(--ink)' }}>
                  {(profile?.role || user?.role) === 'admin' ? 'Quản trị viên (Admin)' : (profile?.role || user?.role) === 'teacher' ? 'Giảng viên (Teacher)' : 'Học viên (Student)'}
                </strong>
              </div>
            </div>
          </div>

          <div className="side-info-card">
            <h4>
              <span>🛡</span> Bảo mật tài khoản
            </h4>
            <p>
              Tài khoản của bạn được bảo vệ qua hệ thống xác thực an toàn. Bạn có thể đăng nhập bằng Email hoặc Google.
            </p>
          </div>
        </div>

        {/* Right Column: Detailed Edit Form */}
        <div>
          <div className="profile-card-panel">
            <h3 className="profile-card-title">
              <span>✏️</span> Chỉnh sửa thông tin cá nhân
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="pFullName">Họ và tên *</label>
                  <input
                    id="pFullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Tên hiển thị trên hệ thống và chứng chỉ khi hoàn thành khóa học.
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="pPhone">Số điện thoại liên hệ</label>
                  <input
                    id="pPhone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0981260124"
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Dùng để nhận thông báo khẩn cấp hoặc xác minh tài khoản.
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="pEmail">Địa chỉ Email (Cố định)</label>
                  <input
                    id="pEmail"
                    type="email"
                    readOnly
                    value={profile?.email || ''}
                    style={{ background: '#f8f8fc', color: '#64748b', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Email được dùng làm tên đăng nhập tài khoản AI-LMS.
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Ngày kích hoạt tài khoản</label>
                  <input
                    type="text"
                    readOnly
                    value={memberSince}
                    style={{ background: '#f8f8fc', color: '#64748b', cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Thời điểm bạn bắt đầu học tập trên hệ thống.
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
                  {saving ? 'Đang lưu thay đổi...' : 'Lưu thay đổi hồ sơ'}
                </button>
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="btn btn-secondary"
                >
                  Hủy / Tải lại
                </button>
              </div>
            </form>
          </div>

          <div className="profile-card-panel" style={{ background: '#f8f7ff', border: '1px dashed #c7d2fe' }}>
            <h4 style={{ fontFamily: 'Space Grotesk', fontSize: '15px', fontWeight: 700, margin: '0 0 6px', color: '#4338ca' }}>
              💡 Lưu ý về tên trên Chứng chỉ
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
              Họ và tên của bạn sẽ được in trực tiếp lên chứng chỉ tốt nghiệp sau khi bạn hoàn thành 100% các bài giảng của khóa học. Hãy đảm bảo bạn nhập đúng họ tên thật có dấu để chứng chỉ có giá trị cao nhất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
