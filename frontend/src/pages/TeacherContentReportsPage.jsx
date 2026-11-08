import React, { useCallback, useEffect, useState } from 'react';
import { learningReportService } from '../features/learning/api.js';
import { useToast } from '../components/toastContext';

const ISSUE_TYPE_LABELS = {
  BROKEN_VIDEO: 'Broken Video / Playback Issue',
  BROKEN_FILE: 'Broken File / Download Issue',
  INCORRECT_CONTENT: 'Incorrect Content / Typo',
  AUDIO_ISSUE: 'Audio Issue',
  TYPO_ERROR: 'Typo / Content Inaccuracy',
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

export default function TeacherContentReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [newStatus, setNewStatus] = useState('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter ? `status=${statusFilter}` : '';
      const res = await learningReportService.getTeacherReports(query);
      setReports(res.data?.reports || res.reports || []);
    } catch (err) {
      addToast(err.message || 'Unable to load content reports.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, addToast]);

  useEffect(() => {
    void Promise.resolve().then(loadReports);
  }, [loadReports]);

  const handleOpenResolve = (report) => {
    setSelectedReport(report);
    setNewStatus(report.status === 'OPEN' ? 'RESOLVED' : report.status);
    setResolutionNote(report.resolutionNote || '');
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;
    if (!resolutionNote.trim()) {
      addToast('Please provide a resolution note.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await learningReportService.resolveReport(selectedReport.id || selectedReport._id, {
        status: newStatus,
        resolutionNote: resolutionNote.trim(),
      });
      addToast('Content report updated successfully!', 'success');
      setSelectedReport(null);
      await loadReports();
    } catch (err) {
      addToast(err.message || 'Failed to update content report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px', fontFamily: 'Space Grotesk' }}>
          Lesson Content Reports
        </h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
          Review and resolve feedback or issue reports submitted by students in your courses.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: '', label: 'All' },
          { key: 'OPEN', label: 'Pending' },
          { key: 'IN_REVIEW', label: 'In Review' },
          { key: 'RESOLVED', label: 'Resolved' },
          { key: 'REJECTED', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`btn btn-sm ${statusFilter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="spinner" style={{ margin: '40px auto' }}></div>
      ) : reports.length === 0 ? (
        <div className="empty-state" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px' }}>No content reports found</h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            All lessons in your courses are running smoothly!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map((report) => {
            const id = report.id || report._id;
            const badge = STATUS_BADGES[report.status] || { label: report.status, color: '#475569', bg: '#f1f5f9' };

            return (
              <div
                key={id}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: badge.color,
                        background: badge.bg,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--purple)' }}>
                      {ISSUE_TYPE_LABELS[report.issueType] || report.issueType}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      • {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px' }}>
                    {report.courseTitle || 'Course'} {report.lessonTitle ? `› ${report.lessonTitle}` : ''}
                  </h3>

                  <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 10px', lineHeight: 1.5 }}>
                    "{report.description}"
                  </p>

                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Student: <strong>{report.studentName || 'Student'}</strong> ({report.studentEmail || 'N/A'})
                  </div>

                  {report.resolutionNote && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #2563eb', fontSize: '13px' }}>
                      <strong style={{ color: '#1e40af' }}>Instructor Response:</strong> {report.resolutionNote}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleOpenResolve(report)}
                    className="btn btn-secondary btn-sm"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    ✏️ Resolve Report
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px' }}>
              Resolve Content Report
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px' }}>
              Lesson: <strong>{selectedReport.lessonTitle || 'N/A'}</strong> ({selectedReport.courseTitle || 'N/A'})
            </p>

            <form onSubmit={handleResolveSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Update Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)' }}
                >
                  <option value="IN_REVIEW">In Review</option>
                  <option value="RESOLVED">Resolved (Issue Fixed)</option>
                  <option value="REJECTED">Rejected (Invalid Report)</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Resolution Note / Student Response
                </label>
                <textarea
                  rows="4"
                  required
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explain the fix or provide clarification for the student..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="btn btn-secondary btn-sm"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting || !resolutionNote.trim()}
                >
                  {submitting ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
