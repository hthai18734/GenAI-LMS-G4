import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { learningReportService } from '../features/learning/api.js';
import { useToast } from '../components/toastContext';

const ISSUE_TYPE_LABELS = {
  BROKEN_VIDEO: 'Broken Video / Playback Error',
  AUDIO_ISSUE: 'Audio Issue',
  BROKEN_FILE: 'Broken File / Download Issue',
  INCORRECT_CONTENT: 'Incorrect Content / Typo',
  WRONG_ANSWER: 'Incorrect Quiz Answer',
  OUTDATED_CONTENT: 'Outdated Content',
  OTHER: 'Other Issue',
};

const STATUS_BADGES = {
  OPEN: { label: 'Pending', color: '#ea580c', bg: '#ffedd5' },
  IN_REVIEW: { label: 'In Review', color: '#2563eb', bg: '#dbeafe' },
  RESOLVED: { label: 'Resolved', color: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
};

export default function StudentContentReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const { addToast } = useToast();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await learningReportService.getMyReports();
      setReports(res.data?.reports || res.reports || []);
    } catch (err) {
      addToast(err.message || 'Unable to load your issue reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void Promise.resolve().then(fetchReports);
  }, [fetchReports]);

  const filtered = reports.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED').length;
  const pendingCount = reports.filter((r) => r.status === 'OPEN' || r.status === 'IN_REVIEW').length;

  if (loading) {
    return <div className="spinner" style={{ margin: '40px auto' }}></div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="section-title" style={{ margin: '0 0 6px' }}>My Issue Reports & Instructor Feedback</h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
            Track issues you reported and read responses from course instructors.
          </p>
        </div>
        <button type="button" onClick={fetchReports} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--panel)', padding: '16px 20px', borderRadius: '12px', border: '1px solid #eeeef6' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Total Reports</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)' }}>{reports.length}</div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '16px 20px', borderRadius: '12px', border: '1px solid #eeeef6' }}>
          <div style={{ fontSize: '13px', color: '#16a34a', marginBottom: '4px' }}>Resolved & Responded</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>{resolvedCount}</div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '16px 20px', borderRadius: '12px', border: '1px solid #eeeef6' }}>
          <div style={{ fontSize: '13px', color: '#ea580c', marginBottom: '4px' }}>Awaiting Review</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ea580c' }}>{pendingCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map((st) => {
          const count = st === 'ALL' ? reports.length : reports.filter((r) => r.status === st).length;
          const label = st === 'ALL' ? 'All' : (STATUS_BADGES[st]?.label || st);
          const isActive = filterStatus === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Report List */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px' }}>No reports found</h3>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
            {filterStatus === 'ALL'
              ? 'You have not submitted any issue reports yet.'
              : `No reports currently match status "${STATUS_BADGES[filterStatus]?.label || filterStatus}".`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((r) => {
            const badge = STATUS_BADGES[r.status] || { label: r.status, color: '#64748b', bg: '#f1f5f9' };
            const typeLabel = ISSUE_TYPE_LABELS[r.issueType] || r.issueType;
            return (
              <div
                key={r.id}
                style={{
                  background: 'var(--panel)',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          fontWeight: 700,
                          fontSize: '11px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        {badge.label}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#4f46e5' }}>
                        {typeLabel}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        • {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
                      {r.course?.title || 'Course'}
                      {r.lesson?.title && (
                        <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--muted)', marginLeft: '8px' }}>
                          › Lesson: {r.lesson.title}
                        </span>
                      )}
                    </h4>
                  </div>

                  {r.course?.id && (
                    <Link
                      to={`/courses/${r.course.id}/learn`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                      Go to Lesson &rarr;
                    </Link>
                  )}
                </div>

                {/* Student's Report Content */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 14px', border: '1px solid #f1f5f9', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Your Description:
                  </div>
                  <div style={{ fontSize: '14px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                    "{r.description}"
                  </div>
                </div>

                {/* Teacher's Response */}
                {r.resolutionNote ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                      <span>💬</span> Instructor Response:
                    </div>
                    <div style={{ fontSize: '14px', color: '#15803d', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                      "{r.resolutionNote}"
                    </div>
                    {r.resolvedAt && (
                      <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '6px' }}>
                        Responded on {new Date(r.resolvedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⏳</span> Awaiting response from instructor...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
