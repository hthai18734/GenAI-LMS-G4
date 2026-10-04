import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentService } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/Toast';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const { user } = useAuth();
  const { addToast } = useToast();

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await studentService.getCertificates();
      setCertificates(res.data?.certificates || []);
    } catch (err) {
      addToast(err.message || 'Failed to load certificates.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="section-title" style={{ margin: '0 0 4px' }}>My Certificates</h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
            Earn certificates upon 100% completion of enrolled courses
          </p>
        </div>
        <button onClick={fetchCertificates} className="btn btn-secondary btn-sm">
          Refresh
        </button>
      </div>

      {certificates.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6' }}>
          <div className="empty-icon">🏆</div>
          <h3>No certificates yet</h3>
          <p>Complete all lessons in a course to earn and view your official verified completion certificate.</p>
          <div style={{ marginTop: '16px' }}>
            <Link to="/courses" className="btn btn-primary">
              Continue Learning
            </Link>
          </div>
        </div>
      ) : (
        <div className="cert-grid">
          {certificates.map((cert) => (
            <div key={cert.id} className="cert-card">
              <div className="cert-icon">🎓</div>
              <h3 className="cert-course">{cert.courseTitle}</h3>
              <div className="cert-number">
                <strong>ID:</strong> {cert.certificateNumber}
              </div>
              <div className="cert-date">
                <strong>Issued:</strong> {new Date(cert.issuedAt).toLocaleDateString()}
              </div>
              <div style={{ marginTop: '18px' }}>
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="btn btn-primary btn-sm btn-full"
                >
                  View & Print Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setSelectedCert(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              padding: '36px',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '8px double #d4af37',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', letterSpacing: '4px', textTransform: 'uppercase', color: '#b45309', fontWeight: 700, marginBottom: '8px' }}>
                AI-LMS Certificate of Completion
              </div>
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '26px', margin: '0 0 16px', color: '#1e1b4b' }}>
                Certificate of Achievement
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 8px' }}>
                This is proudly presented to
              </p>
              <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '24px', color: 'var(--purple)', margin: '0 0 16px', borderBottom: '2px solid #e0dcff', display: 'inline-block', paddingBottom: '4px' }}>
                {user?.fullName || 'Student'}
              </h3>
              <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 24px' }}>
                for successfully completing all required modules and practical coursework in the course:
              </p>
              <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 24px' }}>
                {selectedCert.courseTitle}
              </h4>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '18px', fontSize: '12px', color: '#64748b' }}>
                <div>
                  <strong>Certificate ID:</strong> {selectedCert.certificateNumber}
                </div>
                <div>
                  <strong>Date Issued:</strong> {new Date(selectedCert.issuedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={handlePrint} className="btn btn-primary btn-sm">
                🖨 Print / Save PDF
              </button>
              <button onClick={() => setSelectedCert(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
