/**
 * Author: ThienDDN - CE182101 / Team
 * Created at: 01/10/2026
 * Description: Student Teacher Application Submission Page
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentService } from '../features/student/api.js';
import { useAuth } from '../features/auth/useAuth.js';
import { useToast } from '../components/toastContext';

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
    void Promise.resolve().then(fetchApplicationStatus);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bio.trim() || bio.trim().length < 10) {
      addToast('Please describe yourself and your experience (at least 10 characters).', 'error');
      return;
    }
    if (!agreed) {
      addToast('Please agree to the AI-LMS teaching terms.', 'error');
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

      addToast('Application submitted! An administrator will review it and respond soon.', 'success');
      await fetchApplicationStatus();
    } catch (err) {
      addToast(err.message || 'Unable to submit your application.', 'error');
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
            You are already a teacher!
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
            Your account has teaching access. You can create lessons, manage classes, and publish courses.
          </p>
          <Link to="/teacher/dashboard" className="primary" style={{ display: 'inline-block', padding: '12px 24px' }}>
            Go to Teacher Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page" style={{ maxWidth: '800px', margin: '20px auto 40px' }}>
      <div className="management-header">
        <div>
          <h1>Become an AI-LMS Teacher</h1>
          <p>Join our teaching team, share your knowledge, and earn from your courses.</p>
        </div>
      </div>

      {/* Case 2: Application is PENDING */}
      {application?.status === 'pending' && (
        <div className="management-card" style={{ padding: '32px', marginBottom: '24px', borderLeft: '5px solid #d97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <span style={{ fontSize: '28px' }}>⏳</span>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, color: '#92400e' }}>
                Application Pending Review
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Submitted: {new Date(application.createdAt).toLocaleString('en-US')}
              </span>
            </div>
            <span className="status-badge status-pending_review" style={{ marginLeft: 'auto' }}>
              Pending Review
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, margin: '14px 0' }}>
            Your application is awaiting administrator review, which usually takes 24–48 hours. Check this page or your email for updates.
          </p>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', fontSize: '13px', display: 'grid', gap: '8px' }}>
            <div><strong>Professional Bio:</strong> {application.bio}</div>
            {application.cvUrl && <div><strong>CV Link:</strong> <a href={application.cvUrl} target="_blank" rel="noreferrer" style={{ color: '#4935db' }}>{application.cvUrl}</a></div>}
            {application.certificates?.length > 0 && <div><strong>Certificates:</strong> {application.certificates.join(', ')}</div>}
          </div>
        </div>
      )}

      {/* Case 3: Application was REJECTED */}
      {application?.status === 'rejected' && (
        <div className="management-card" style={{ padding: '24px', marginBottom: '24px', borderLeft: '5px solid #dc2626', background: '#fff5f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <h2 style={{ fontSize: '17px', margin: 0, color: '#991b1b' }}>
              Previous Application Rejected
            </h2>
          </div>
          <p style={{ color: '#b91c1c', fontSize: '14px', margin: '6px 0 12px' }}>
            <strong>Rejection Reason:</strong> {application.rejectReason || 'The application did not provide enough evidence of professional experience.'}
          </p>
          <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
            Add more details and submit the form below for another review.
          </p>
        </div>
      )}

      {/* Application Form */}
      {(!application || application.status === 'rejected') && (
        <form className="management-card course-form" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '100%' }}>
          <div style={{ borderBottom: '1px solid #f0eff9', paddingBottom: '16px', marginBottom: '8px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px' }}>Application Details</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
              Applicant: <strong>{user?.fullName}</strong> ({user?.email})
            </p>
          </div>

          <label>
            Bio & Professional Experience *
            <textarea
              rows="5"
              placeholder="Describe your expertise, years of work or teaching experience, and the technologies or subjects you know best..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
            />
            <small style={{ color: 'var(--muted)' }}>At least 10 characters.</small>
          </label>

          <label>
            CV / Portfolio URL (LinkedIn / Google Drive / Portfolio)
            <input
              type="url"
              placeholder="https://drive.google.com/... or https://linkedin.com/in/..."
              value={cvUrl}
              onChange={(e) => setCvUrl(e.target.value)}
            />
          </label>

          <label>
            Qualifications / Certificates (comma-separated)
            <input
              type="text"
              placeholder="Example: IELTS 8.0, AWS Solutions Architect, MSc in IT, PMP..."
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
              I confirm that my information is accurate and agree to follow AI-LMS course quality standards.
            </span>
          </label>

          <div className="form-actions" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={submitting}
              style={{ padding: '12px 28px', fontSize: '15px' }}
            >
              {submitting ? 'Submitting…' : '📤 Submit Application'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
