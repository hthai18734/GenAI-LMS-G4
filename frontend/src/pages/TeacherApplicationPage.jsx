/**
 * Author: ThienDDN - CE182101 / Team
 * Created at: 01/10/2026
 * Description: Student Teacher Application Submission Page
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentService } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/Toast';

export default function TeacherApplicationPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [bio, setBio] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [certificates, setCertificates] = useState('');
  const [agreed, setAgreed] = useState(false);

  const fetchApplicationStatus = async () => {
    setLoading(true);
    try {
      const res = await studentService.getTeacherApplication();
      setApplication(res.data?.application || null);
      if (res.data?.application) {
        setBio(res.data.application.bio || '');
        setCvUrl(res.data.application.cvUrl || '');
        setCertificates((res.data.application.certificates || []).join(', '));
      }
    } catch (err) {
      console.warn('Error fetching application status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bio.trim() || bio.trim().length < 10) {
      addToast('Vui lòng giới thiệu bản thân và kinh nghiệm (tối thiểu 10 ký tự).', 'error');
      return;
    }
    if (!agreed) {
      addToast('Vui lòng đồng ý với điều khoản giảng dạy trên AI-LMS.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await studentService.applyTeacher({
        bio: bio.trim(),
        cvUrl: cvUrl.trim(),
        certificates: certificates
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      });

      addToast('Nộp hồ sơ thành công! Ban Quản Trị sẽ xem xét và phản hồi sớm.', 'success');
      await fetchApplicationStatus();
    } catch (err) {
      addToast(err.message || 'Không thể nộp hồ sơ ứng tuyển.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Case 1: User is already a teacher
  if (user?.role === 'teacher') {
    return (
      <div className="management-page" style={{ maxWidth: '720px', margin: '40px auto' }}>
        <div className="management-card" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '24px', marginBottom: '8px' }}>
            Bạn đã là Giảng viên chính thức!
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
            Tài khoản của bạn đã được kích hoạt toàn bộ quyền hạn giảng dạy. Bạn có thể soạn giáo án, mở lớp và xuất bản khóa học ngay bây giờ.
          </p>
          <Link to="/teacher/dashboard" className="primary" style={{ display: 'inline-block', padding: '12px 24px' }}>
            Truy cập Teacher Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page" style={{ maxWidth: '800px', margin: '20px auto 40px' }}>
      <div className="management-header">
        <div>
          <h1>Đăng ký làm Giảng viên AI-LMS</h1>
          <p>Tham gia đội ngũ đào tạo chất lượng cao, chia sẻ kiến thức và nhận thu nhập từ học viên.</p>
        </div>
      </div>

      {/* Case 2: Application is PENDING */}
      {application?.status === 'pending' && (
        <div className="management-card" style={{ padding: '32px', marginBottom: '24px', borderLeft: '5px solid #d97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <span style={{ fontSize: '28px' }}>⏳</span>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, color: '#92400e' }}>
                Hồ sơ ứng tuyển đang chờ xét duyệt
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Nộp lúc: {new Date(application.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
            <span className="status-badge status-pending_review" style={{ marginLeft: 'auto' }}>
              Pending Review
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, margin: '14px 0' }}>
            Hồ sơ của bạn đã được ghi nhận vào hàng đợi kiểm duyệt của Ban Quản Trị. Quá trình thẩm định thông thường kéo dài từ 24 - 48 giờ. Bạn có thể kiểm tra lại tại đây hoặc nhận thông báo qua email.
          </p>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', fontSize: '13px', display: 'grid', gap: '8px' }}>
            <div><strong>Tiểu sử chuyên môn:</strong> {application.bio}</div>
            {application.cvUrl && <div><strong>Đường dẫn CV:</strong> <a href={application.cvUrl} target="_blank" rel="noreferrer" style={{ color: '#4935db' }}>{application.cvUrl}</a></div>}
            {application.certificates?.length > 0 && <div><strong>Chứng chỉ:</strong> {application.certificates.join(', ')}</div>}
          </div>
        </div>
      )}

      {/* Case 3: Application was REJECTED */}
      {application?.status === 'rejected' && (
        <div className="management-card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '5px solid #dc2626', background: '#fff5f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <h2 style={{ fontSize: '17px', margin: 0, color: '#991b1b' }}>
              Hồ sơ ứng tuyển trước đó chưa được duyệt
            </h2>
          </div>
          <p style={{ color: '#b91c1c', fontSize: '14px', margin: '6px 0 12px' }}>
            <strong>Lý do từ chối:</strong> {application.rejectReason || 'Hồ sơ chưa cung cấp đủ bằng chứng chuyên môn.'}
          </p>
          <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
            Bạn có thể bổ sung thông tin chi tiết hơn và nộp lại mẫu đơn bên dưới để được Ban Quản Trị thẩm định lại.
          </p>
        </div>
      )}

      {/* Application Form */}
      {(!application || application.status === 'rejected') && (
        <form className="management-card course-form" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '100%' }}>
          <div style={{ borderBottom: '1px solid #f0eff9', paddingBottom: '16px', marginBottom: '8px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px' }}>Thông tin hồ sơ năng lực</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
              Người ứng tuyển: <strong>{user?.fullName}</strong> ({user?.email})
            </p>
          </div>

          <label>
            Tiểu sử & Kinh nghiệm chuyên môn *
            <textarea
              rows="5"
              placeholder="Giới thiệu về chuyên ngành của bạn, số năm kinh nghiệm làm việc/giảng dạy, các công nghệ hoặc lĩnh vực bạn tự tin nhất..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
            />
            <small style={{ color: 'var(--muted)' }}>Tối thiểu 10 ký tự.</small>
          </label>

          <label>
            Đường dẫn CV / Hồ sơ năng lực (Link LinkedIn / Google Drive / Portfolio)
            <input
              type="url"
              placeholder="https://drive.google.com/... hoặc https://linkedin.com/in/..."
              value={cvUrl}
              onChange={(e) => setCvUrl(e.target.value)}
            />
          </label>

          <label>
            Bằng cấp / Chứng chỉ chuyên môn (cách nhau bằng dấu phẩy)
            <input
              type="text"
              placeholder="Ví dụ: IELTS 8.0, AWS Solutions Architect, Thạc sĩ CNTT, PMP..."
              value={certificates}
              onChange={(e) => setCertificates(e.target.value)}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '6px' }}>
            <input
              type="checkbox"
              style={{ width: '18px', height: '18px' }}
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
              Tôi cam kết cung cấp thông tin trung thực và tuân thủ các tiêu chuẩn chất lượng bài giảng của AI-LMS.
            </span>
          </label>

          <div className="form-actions" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="primary"
              disabled={submitting}
              style={{ padding: '12px 28px', fontSize: '15px' }}
            >
              {submitting ? 'Đang gửi hồ sơ…' : '📤 Nộp hồ sơ ứng tuyển'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
