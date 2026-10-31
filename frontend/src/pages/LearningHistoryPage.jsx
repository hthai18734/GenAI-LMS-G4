import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentService } from '../features/student/api.js';
import { learningStatsService } from '../features/learning/api.js';
import { useToast } from '../components/toastContext';

export default function LearningHistoryPage() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchStats = useCallback(async (selectedRange, signal) => {
    try {
      const res = await learningStatsService.getStatistics(selectedRange, { signal });
      setStats(res.data?.stats || res.data || null);
    } catch (error) {
      if (error.name === 'AbortError') return;
      // stats may be empty if no logs yet
      setStats(null);
    }
  }, []);

  const fetchHistory = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await studentService.getLearningHistory({ signal });
      setHistory(res.data?.history || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      addToast(err.message || 'Unable to load learning history.', 'error');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => fetchHistory(controller.signal));
    return () => controller.abort();
  }, [fetchHistory]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => fetchStats(range, controller.signal));
    return () => controller.abort();
  }, [fetchStats, range]);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  if (loading) {
    return <div className="spinner" style={{ margin: '40px auto' }}></div>;
  }

  const summary = stats?.summary || {
    totalHours: 0,
    totalMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    activeDays: 0,
    periodDeltaPercent: 0,
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="section-title" style={{ margin: '0 0 4px', fontFamily: 'Space Grotesk' }}>
            Learning Progress & Statistics
          </h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>
            Track your actual study time, consecutive learning streaks, and completed lesson history
          </p>
        </div>
        <button onClick={() => fetchHistory()} className="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      {/* Statistics Section */}
      <div style={{ background: 'var(--panel, #ffffff)', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 600, margin: 0 }}>
            📊 Learning Activity Statistics
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleRangeChange('week')}
              className={`btn btn-sm ${range === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Past 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange('month')}
              className={`btn btn-sm ${range === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Past 30 Days
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>⏱ Total Study Time</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)' }}>
              {summary.totalHours || 0} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)' }}>hrs</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              ≈ {summary.totalMinutes || 0} cumulative mins
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>🔥 Consecutive Streak</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ea580c' }}>
              {summary.currentStreak || 0} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)' }}>days</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              Personal best: {summary.longestStreak || 0} days
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>📅 Active Days</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--purple)' }}>
              {summary.activeDays || 0} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)' }}>days</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              In the past {range === 'week' ? '7 days' : '30 days'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>📈 vs Previous Period</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: (summary.periodDeltaPercent || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
              {(summary.periodDeltaPercent || 0) > 0 ? `+${summary.periodDeltaPercent}` : summary.periodDeltaPercent || 0}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              {(summary.periodDeltaPercent || 0) >= 0 ? 'Positive growth' : 'Decreased vs prior period'}
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        {((stats?.daily && stats.daily.length > 0) || (stats?.dailyBreakdown && stats.dailyBreakdown.length > 0)) && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Daily study breakdown:</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
              {(stats?.daily || stats?.dailyBreakdown || []).map((item, idx) => {
                const minutes = item.activeMinutes !== undefined ? item.activeMinutes : Math.round((item.seconds || 0) / 60);
                const isMetStandard = minutes >= 10;
                return (
                  <div
                    key={idx}
                    style={{
                      flex: '1 0 90px',
                      padding: '10px 8px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      background: isMetStandard ? '#eff6ff' : '#f8fafc',
                      border: isMetStandard ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                      {item.date ? item.date.substring(5) : ''}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: isMetStandard ? '#1d4ed8' : '#64748b' }}>
                      {minutes > 0 ? `${minutes}m` : '0m'}
                    </div>
                    <div style={{ fontSize: '10px', color: isMetStandard ? '#2563eb' : 'var(--muted)', marginTop: '2px' }}>
                      {isMetStandard ? '✓ Met Goal' : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Completed Lessons Table */}
      <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '14px' }}>
        Lesson Completion History
      </h3>

      {history.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6', padding: '36px', textAlign: 'center' }}>
          <div className="empty-icon" style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
          <h4 style={{ margin: '0 0 6px' }}>No completed lessons yet</h4>
          <p style={{ color: 'var(--muted)', margin: '0 0 16px', fontSize: '14px' }}>
            As you study and complete lessons, your learning progress will appear here.
          </p>
          <div>
            <Link to="/courses" className="btn btn-primary btn-sm">
              View My Courses &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Lesson</th>
              <th>Status</th>
              <th>Completed Date</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record) => (
              <tr key={record.id || `${record.courseId}-${record.lessonId}`}>
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
