import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentService } from '../services/api';
import { useToast } from '../components/Toast';

export default function LearningHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await studentService.getLearningHistory();
      setHistory(res.data?.history || []);
    } catch (err) {
      addToast(err.message || 'Failed to load learning history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 className="section-title" style={{ margin: '0 0 4px' }}>
            Learning History
          </h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
            Review your activity log, completed modules, and learning milestones
          </p>
        </div>
        <button onClick={fetchHistory} className="btn btn-secondary btn-sm">
          Refresh
        </button>
      </div>

      {history.length === 0 ? (
        <div
          className="empty-state"
          style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6' }}
        >
          <div className="empty-icon">⏳</div>
          <h3>No learning history yet</h3>
          <p>
            Once you start viewing and completing lessons, your progress activity will appear here.
          </p>
          <div style={{ marginTop: '16px' }}>
            <Link to="/courses" className="btn btn-primary">
              Browse Courses
            </Link>
          </div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Course Title</th>
              <th>Lesson Title</th>
              <th>Status</th>
              <th>Completed Date</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record, index) => (
              <tr key={index}>
                <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{record.courseTitle}</td>
                <td>{record.lessonTitle}</td>
                <td>
                  <span className={`badge badge-${record.status}`}>
                    {record.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </td>
                <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  {record.completedAt ? new Date(record.completedAt).toLocaleString() : '—'}
                </td>
                <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
