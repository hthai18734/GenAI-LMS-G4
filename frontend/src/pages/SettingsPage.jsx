import React, { useEffect, useState } from 'react';
import { studentService } from '../services/api';
import { useToast } from '../components/Toast';

const PREF_INFO_MAP = {
  email: {
    icon: '📧',
    label: 'Thông báo tổng hợp qua Email',
    description: 'Nhận tóm tắt tiến độ học tập và bản tin kiến thức quan trọng qua hòm thư cá nhân.',
  },
  course_update: {
    icon: '📚',
    label: 'Cập nhật Khóa học & Bài giảng mới',
    description: 'Nhận thông báo ngay khi có bài giảng, tài liệu bổ trợ hoặc bài tập mới được đăng tải.',
  },
  'Course & Lesson Updates': {
    icon: '📚',
    label: 'Cập nhật Khóa học & Bài giảng mới',
    description: 'Nhận thông báo ngay khi có bài giảng, tài liệu bổ trợ hoặc bài tập mới được đăng tải.',
  },
  enrollment: {
    icon: '🎓',
    label: 'Xác nhận Đăng ký khóa học',
    description: 'Thông báo xác nhận khi bạn ghi danh vào khóa học mới hoặc hoàn thành khóa học.',
  },
  promotion: {
    icon: '🎁',
    label: 'Khóa học miễn phí & Sự kiện học tập',
    description: 'Nhận gợi ý các khóa học công nghệ mới, sự kiện chia sẻ và ưu đãi học viên.',
  },
  system: {
    icon: '⚙️',
    label: 'Thông báo Hệ thống & Bảo mật',
    description: 'Cảnh báo đăng nhập lạ, thông báo bảo trì định kỳ và các cập nhật nền tảng quan trọng.',
  },
  system_announcement: {
    icon: '📢',
    label: 'Thông báo Hệ thống & Nền tảng',
    description: 'Cập nhật tính năng mới, lịch bảo trì hệ thống và các chính sách học tập.',
  },
  assignment_reminder: {
    icon: '⏰',
    label: 'Nhắc nhở Nhiệm vụ & Bài tập',
    description: 'Cảnh báo trước hạn nộp bài tập và các mốc thời gian hoàn thành bài học.',
  },
  discussion_reply: {
    icon: '💬',
    label: 'Phản hồi Thảo luận & Diễn đàn',
    description: 'Thông báo khi giảng viên hoặc bạn cùng lớp phản hồi câu hỏi của bạn.',
  },
};

export default function SettingsPage() {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingType, setTestingType] = useState(null);
  const { addToast } = useToast();

  const handleTestNotification = async (type) => {
    setTestingType(type);
    try {
      const res = await studentService.sendTestNotification(type);
      addToast(res.message || 'Đã gửi thông báo thử nghiệm! Hãy kiểm tra chuông 🔔', 'success');
    } catch (err) {
      addToast(err.message || 'Không thể gửi thông báo thử nghiệm.', 'error');
    } finally {
      setTestingType(null);
    }
  };

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await studentService.getNotificationPreferences();
      setPreferences(res.data?.preferences || []);
    } catch (err) {
      addToast(err.message || 'Không thể tải cài đặt thông báo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleToggle = (type) => {
    setPreferences((prev) =>
      prev.map((item) => (item.type === type ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await studentService.updateNotificationPreferences(preferences);
      addToast('Đã lưu tùy chọn thông báo thành công!', 'success');
    } catch (err) {
      addToast(err.message || 'Cập nhật cài đặt thất bại.', 'error');
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 className="section-title" style={{ margin: '0 0 6px', fontSize: '22px' }}>
          Cài đặt thông báo & Tùy chọn học tập
        </h2>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
          Tùy chỉnh các kênh thông báo và tần suất nhận tin để tối ưu hóa trải nghiệm học tập của bạn
        </p>
      </div>

      {/* Balanced 2-Column Grid */}
      <div className="settings-grid-layout">
        {/* Left Column: Notification Toggles Form */}
        <div>
          <form onSubmit={handleSave}>
            <div className="profile-card-panel">
              <h3 className="profile-card-title">
                <span>🔔</span> Tùy chọn thông báo sự kiện
              </h3>

              <div className="pref-list" style={{ marginBottom: '24px' }}>
                {preferences.map((pref) => {
                  const info = PREF_INFO_MAP[pref.type] || {
                    icon: '📌',
                    label: pref.type,
                    description: 'Tùy chọn thông báo hệ thống',
                  };

                  return (
                    <div
                      key={pref.type}
                      className="pref-item"
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        border: '1px solid #eeeef6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: '#f4f3ff',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '20px',
                            flexShrink: 0,
                          }}
                        >
                          {info.icon}
                        </div>
                        <div>
                          <div className="pref-label" style={{ fontSize: '15px', color: 'var(--ink)' }}>
                            {info.label}
                          </div>
                          <div className="pref-desc" style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.5 }}>
                            {info.description}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn-test-noti"
                          onClick={() => handleTestNotification(pref.type)}
                          disabled={testingType === pref.type}
                          title={`Gửi thử thông báo loại "${info.label}"`}
                        >
                          {testingType === pref.type ? 'Đang gửi...' : '🔔 Gửi thử'}
                        </button>
                        <label className="toggle" style={{ flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={pref.enabled}
                            onChange={() => handleToggle(pref.type)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f0eff9' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ minWidth: '180px' }}
                >
                  {saving ? 'Đang lưu cài đặt...' : 'Lưu cài đặt thông báo'}
                </button>
                <button
                  type="button"
                  onClick={fetchPreferences}
                  className="btn btn-secondary"
                >
                  Đặt lại
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Tips & Channels Cards */}
        <div>
          <div className="side-info-card">
            <h4>
              <span>📬</span> Kênh nhận thông báo
            </h4>
            <p style={{ marginBottom: '12px' }}>
              Hệ thống AI-LMS gửi thông báo qua 2 kênh chính:
            </p>
            <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>
              <li><strong>Hòm thư cá nhân:</strong> Nhận email tự động khi có bài học hoặc chứng chỉ mới.</li>
              <li><strong>Thông báo trực tiếp trên web:</strong> Hiển thị chuông thông báo ở góc phải khi đang học.</li>
            </ul>
          </div>

          <div className="side-info-card" style={{ background: '#f8f7ff', border: '1px dashed #c7d2fe' }}>
            <h4 style={{ color: '#4338ca' }}>
              <span>💡</span> Lời khuyên cho học viên
            </h4>
            <p>
              Giữ bật <strong>Cập nhật Khóa học & Bài giảng mới</strong> giúp bạn không bỏ lỡ các tài liệu quan trọng và giữ vững chuỗi ngày học tập liên tục để sớm nhận chứng chỉ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
