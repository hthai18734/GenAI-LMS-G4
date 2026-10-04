import React, { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { useToast } from '../components/Toast';

export default function AdminTeacherApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [rejectingApp, setRejectingApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTeacherApplications(selectedStatus || undefined);
      setApplications(res.data?.applications || []);
    } catch (err) {
      addToast(err.message || 'Failed to fetch applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [selectedStatus]);

  const handleApprove = async (appId) => {
    if (!window.confirm('Are you sure you want to approve this teacher application?')) return;
    setActionLoading(true);
    try {
      await adminService.approveTeacherApplication(appId);
      addToast('Teacher application approved successfully!', 'success');
      await fetchApplications();
    } catch (err) {
      addToast(err.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectModal = (app) => {
    setRejectingApp(app);
    setRejectReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      addToast('Reason required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.rejectTeacherApplication(rejectingApp._id, rejectReason.trim());
      addToast('Teacher application rejected.', 'success');
      setRejectingApp(null);
      setRejectReason('');
      await fetchApplications();
    } catch (err) {
      addToast(err.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 24px', color: '#0f172a' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 6px', color: '#0f172a' }}>
          Teacher Applications Management
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          Review candidate profiles, approve to upgrade role to teacher, or reject with clear feedback.
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '24px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '12px'
      }}>
        {['pending', 'approved', 'rejected'].map((status) => {
          const isActive = selectedStatus === status;
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              style={{
                textTransform: 'capitalize',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                border: '1px solid',
                background: isActive ? '#4f46e5' : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                borderColor: isActive ? '#4f46e5' : '#cbd5e1',
                transition: 'all 0.15s ease',
              }}
            >
              {status}
            </button>
          );
        })}
      </div>

      {/* Applications List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#64748b' }}>
          Loading applications...
        </div>
      ) : applications.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          No {selectedStatus} teacher applications found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map((app) => (
            <div
              key={app._id}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {app.userId?.avatar ? (
                    <img
                      src={app.userId.avatar}
                      alt={app.userId.fullName}
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: '#e0e7ff',
                      color: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '18px'
                    }}>
                      {app.userId?.fullName ? app.userId.fullName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 4px', color: '#0f172a' }}>
                      {app.userId?.fullName || 'Candidate'}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {app.userId?.email} • Applied on {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background:
                        app.status === 'approved'
                          ? '#dcfce7'
                          : app.status === 'rejected'
                          ? '#fee2e2'
                          : '#fef3c7',
                      color:
                        app.status === 'approved'
                          ? '#16a34a'
                          : app.status === 'rejected'
                          ? '#dc2626'
                          : '#d97706',
                    }}
                  >
                    {app.status}
                  </span>

                  {app.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleApprove(app._id)}
                        disabled={actionLoading}
                        style={{
                          padding: '7px 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(app)}
                        disabled={actionLoading}
                        style={{
                          padding: '7px 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio & Details Box */}
              <div style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#334155',
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#0f172a' }}>Bio / Experience:</strong> {app.bio || 'No bio submitted.'}
                </div>
                {app.cvUrl && (
                  <div style={{ marginBottom: '6px' }}>
                    <strong style={{ color: '#0f172a' }}>Portfolio / Document:</strong>{' '}
                    <a href={app.cvUrl} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontWeight: '600' }}>
                      View Submitted Document ↗
                    </a>
                  </div>
                )}
                {app.rejectReason && (
                  <div style={{ marginTop: '8px', color: '#dc2626', background: '#fff1f2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                    <strong>Rejection Reason:</strong> {app.rejectReason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── REJECT MODAL (SOLID SOLID BACKGROUND) ─── */}
      {rejectingApp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
            border: '1px solid #e2e8f0',
            position: 'relative'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#0f172a' }}>
              Reject Teacher Application
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '18px', lineHeight: 1.5 }}>
              Please provide a clear reason for rejecting <strong>{rejectingApp.userId?.fullName}</strong>. This feedback will be sent to the candidate via email & notification.
            </p>

            <form onSubmit={handleConfirmReject}>
              <div style={{ marginBottom: '20px' }}>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter reason for rejection (required)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRejectingApp(null)}
                  disabled={actionLoading}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
