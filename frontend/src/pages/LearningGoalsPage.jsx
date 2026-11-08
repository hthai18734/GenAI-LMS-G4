import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { learningGoalService } from '../features/learning/api.js';
import { studentService } from '../features/student/api.js';
import { useToast } from '../components/toastContext';

const GOAL_TYPES = [
  { value: 'REACH_PROGRESS_PERCENT', label: 'Reach Progress Percent (%)', defaultTarget: 80, unit: '%' },
  { value: 'COMPLETE_LESSONS_COUNT', label: 'Complete Lesson Count', defaultTarget: 5, unit: 'lessons' },
  { value: 'COMPLETE_COURSE', label: 'Complete Entire Course (100%)', defaultTarget: 100, unit: '%' },
];

function defaultDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
}

export default function LearningGoalsPage() {
  const [goals, setGoals] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('IN_PROGRESS'); // 'IN_PROGRESS' | 'COMPLETED' | 'ALL'
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [creating, setCreating] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const { addToast } = useToast();

  const [form, setForm] = useState({
    courseId: '',
    goalType: 'REACH_PROGRESS_PERCENT',
    targetValue: 80,
    deadline: defaultDeadline(),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, coursesRes] = await Promise.all([
        learningGoalService.getGoals().catch(() => ({ data: { goals: [] } })),
        studentService.getEnrolledCourses().catch(() => ({ data: { courses: [] } })),
      ]);
      const fetchedGoals = goalsRes.data?.goals || goalsRes.goals || [];
      const fetchedCourses = coursesRes.data?.courses || coursesRes.courses || [];
      setGoals(fetchedGoals);
      setEnrolledCourses(fetchedCourses);

      if (fetchedCourses.length > 0) {
        setForm((prev) => prev.courseId ? prev : ({
          ...prev,
          courseId: fetchedCourses[0].courseId || fetchedCourses[0].id,
        }));
      }
    } catch (err) {
      addToast(err.message || 'Unable to load learning goals.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.courseId) {
      addToast('Please select a course for this goal.', 'error');
      return;
    }
    if (!form.deadline) {
      addToast('Please specify a deadline date.', 'error');
      return;
    }

    setCreating(true);
    try {
      await learningGoalService.createGoal({
        courseId: form.courseId,
        goalType: form.goalType,
        targetValue: form.goalType === 'COMPLETE_COURSE' ? 100 : Number(form.targetValue),
        deadline: new Date(form.deadline).toISOString(),
      });
      addToast('Learning goal created successfully! Stay focused and finish on time.', 'success');
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      addToast(err.message || 'Failed to create learning goal.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingGoal) return;
    try {
      await learningGoalService.updateGoal(editingGoal.id, {
        targetValue: editingGoal.goalType === 'COMPLETE_COURSE' ? 100 : Number(editingGoal.targetValue),
        deadline: new Date(editingGoal.deadline).toISOString(),
      });
      addToast('Learning goal updated successfully.', 'success');
      setEditingGoal(null);
      await loadData();
    } catch (err) {
      addToast(err.message || 'Failed to update learning goal.', 'error');
    }
  };

  const handleDeleteGoal = async (goalId, isCompleted = false) => {
    const confirmMsg = isCompleted
      ? 'Remove this completed goal from your history?'
      : 'Are you sure you want to cancel this active learning goal?';
    if (!window.confirm(confirmMsg)) return;

    try {
      await learningGoalService.cancelGoal(goalId);
      addToast(isCompleted ? 'Completed goal removed from history.' : 'Learning goal has been cancelled.', 'success');
      await loadData();
    } catch (err) {
      addToast(err.message || 'Action failed.', 'error');
    }
  };

  const handleClearAllCompleted = async () => {
    const completedList = goals.filter((g) => g.status === 'COMPLETED');
    if (completedList.length === 0) return;

    if (!window.confirm(`Clear all ${completedList.length} completed goals from your history?`)) return;

    try {
      await Promise.all(completedList.map((g) => learningGoalService.cancelGoal(g.id)));
      addToast('All completed goals have been cleared.', 'success');
      await loadData();
    } catch (err) {
      addToast(err.message || 'Failed to clear completed goals.', 'error');
    }
  };

  // Metrics
  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'IN_PROGRESS'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'COMPLETED'), [goals]);
  const completionRate = useMemo(() => {
    const relevantTotal = activeGoals.length + completedGoals.length;
    return relevantTotal > 0 ? Math.round((completedGoals.length / relevantTotal) * 100) : 0;
  }, [activeGoals, completedGoals]);

  // Tab Filtering
  const displayedGoals = useMemo(() => {
    return goals.filter((goal) => {
      // Filter by tab
      if (activeTab === 'IN_PROGRESS' && goal.status !== 'IN_PROGRESS') return false;
      if (activeTab === 'COMPLETED' && goal.status !== 'COMPLETED') return false;

      // Filter by course dropdown
      if (selectedCourseFilter !== 'ALL') {
        const cId = goal.courseId || '';
        if (cId !== selectedCourseFilter) return false;
      }
      return true;
    });
  }, [goals, activeTab, selectedCourseFilter]);

  if (loading) return <div className="spinner"></div>;

  return (
    <div className="learning-goals-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '24px', margin: 0, color: 'var(--ink)' }}>
            🎯 Personal Learning Goals
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '14px' }}>
            Set learning commitments and track completion progress across your enrolled courses
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm" style={{ padding: '8px 16px', fontSize: '13px' }}>
          ➕ Set New Goal
        </button>
      </div>

      {/* KPI Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--panel)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #eeeef6', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', display: 'grid', placeItems: 'center', fontSize: '22px' }}>
            🎯
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)' }}>{activeGoals.length}</div>
          </div>
        </div>

        <div style={{ background: 'var(--panel)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #eeeef6', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', display: 'grid', placeItems: 'center', fontSize: '22px' }}>
            🏆
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Completed</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#16a34a' }}>{completedGoals.length}</div>
          </div>
        </div>

        <div style={{ background: 'var(--panel)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #eeeef6', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f5f3ff', display: 'grid', placeItems: 'center', fontSize: '22px' }}>
            📈
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Success Rate</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--purple)' }}>{completionRate}%</div>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '22px', flexWrap: 'wrap' }}>
        {/* Segmented Tab Controls */}
        <div style={{ display: 'inline-flex', background: '#f1f1f7', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('IN_PROGRESS')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'IN_PROGRESS' ? '#ffffff' : 'transparent',
              color: activeTab === 'IN_PROGRESS' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: activeTab === 'IN_PROGRESS' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all .15s',
            }}
          >
            <span>🎯 In Progress</span>
            <span style={{ fontSize: '11px', background: activeTab === 'IN_PROGRESS' ? '#eff6ff' : '#e5e7eb', color: activeTab === 'IN_PROGRESS' ? '#2563eb' : '#6b7280', padding: '1px 6px', borderRadius: '999px' }}>
              {activeGoals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'COMPLETED' ? '#ffffff' : 'transparent',
              color: activeTab === 'COMPLETED' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: activeTab === 'COMPLETED' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all .15s',
            }}
          >
            <span>🏆 Completed</span>
            <span style={{ fontSize: '11px', background: activeTab === 'COMPLETED' ? '#ecfdf5' : '#e5e7eb', color: activeTab === 'COMPLETED' ? '#16a34a' : '#6b7280', padding: '1px 6px', borderRadius: '999px' }}>
              {completedGoals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'ALL' ? '#ffffff' : 'transparent',
              color: activeTab === 'ALL' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: activeTab === 'ALL' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all .15s',
            }}
          >
            <span>📋 All Goals</span>
            <span style={{ fontSize: '11px', background: activeTab === 'ALL' ? '#f5f3ff' : '#e5e7eb', color: activeTab === 'ALL' ? 'var(--purple)' : '#6b7280', padding: '1px 6px', borderRadius: '999px' }}>
              {goals.length}
            </span>
          </button>
        </div>

        {/* Course Filter Dropdown & Bulk Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {enrolledCourses.length > 0 && (
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #eeeef6',
                fontSize: '13px',
                background: 'var(--panel)',
                color: 'var(--ink)',
              }}
            >
              <option value="ALL">All Courses ({enrolledCourses.length})</option>
              {enrolledCourses.map((c) => (
                <option key={c.courseId || c.id} value={c.courseId || c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          {activeTab === 'COMPLETED' && completedGoals.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllCompleted}
              className="btn btn-secondary btn-sm"
              style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2', fontSize: '12px' }}
              title="Remove all completed goals from view"
            >
              🧹 Clear All Completed
            </button>
          )}
        </div>
      </div>

      {/* Goal Cards Grid or Empty State */}
      {displayedGoals.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {activeTab === 'IN_PROGRESS' ? '🚀' : activeTab === 'COMPLETED' ? '🏆' : '🎯'}
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px', color: 'var(--ink)' }}>
            {activeTab === 'IN_PROGRESS'
              ? 'All caught up! No active goals'
              : activeTab === 'COMPLETED'
              ? 'No completed goals yet'
              : 'No learning goals found'}
          </h3>
          <p style={{ color: 'var(--muted)', maxWidth: '440px', margin: '0 auto 20px', fontSize: '14px', lineHeight: 1.6 }}>
            {activeTab === 'IN_PROGRESS'
              ? 'You have completed or cleared all your commitments. Challenge yourself by setting a new goal!'
              : activeTab === 'COMPLETED'
              ? 'Goals you finish will be saved here as achievements. Keep going on your active goals!'
              : 'Setting learning goals helps you maintain discipline and complete courses faster.'}
          </p>
          {activeTab === 'IN_PROGRESS' && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Set a New Goal &rarr;
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {displayedGoals.map((goal) => {
            const isCompleted = goal.status === 'COMPLETED';
            const isCancelled = goal.status === 'CANCELLED';
            const progressRatio = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
            const deadlineFormatted = goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'None';
            const isOverdue = !isCompleted && !isCancelled && new Date(goal.deadline).getTime() < currentTime;

            return (
              <div
                key={goal.id}
                style={{
                  background: 'var(--panel)',
                  borderRadius: '14px',
                  border: isCompleted ? '1px solid #86efac' : isOverdue ? '1px solid #fca5a5' : '1px solid #eeeef6',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'var(--shadow)',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className="badge"
                    style={{
                      background: isCompleted ? '#dcfce7' : isCancelled ? '#f3f4f6' : isOverdue ? '#fee2e2' : '#e0e7ff',
                      color: isCompleted ? '#15803d' : isCancelled ? '#6b7280' : isOverdue ? '#b91c1c' : '#4338ca',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {isCompleted ? '✓ COMPLETED' : isCancelled ? 'CANCELLED' : isOverdue ? '⚠️ OVERDUE' : 'IN PROGRESS'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Due: <strong>{deadlineFormatted}</strong>
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px', color: 'var(--ink)' }}>
                    {goal.courseTitle || 'Course'}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Target: {goal.goalType === 'COMPLETE_COURSE' ? 'Complete Course (100%)' : goal.goalType === 'REACH_PROGRESS_PERCENT' ? `Reach ${goal.targetValue}% progress` : `Complete ${goal.targetValue} lessons`}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span>Current progress: <strong>{goal.currentValue} / {goal.targetValue}</strong></span>
                    <span style={{ fontWeight: 700, color: isCompleted ? '#16a34a' : 'var(--purple)' }}>{progressRatio}%</span>
                  </div>
                  <div className="progress-wrap" style={{ margin: 0, height: '8px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progressRatio}%`,
                        background: isCompleted ? '#22c55e' : isOverdue ? '#ef4444' : 'var(--purple)',
                      }}
                    ></div>
                  </div>
                </div>

                {/* Footer Actions */}
                {isCompleted ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f0fdf4' }}>
                    <span style={{ fontSize: '11.5px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🎉</span>
                      Achieved {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : 'on target'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id, true)}
                      className="btn btn-sm"
                      style={{
                        fontSize: '11.5px',
                        color: '#6b7280',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                      title="Remove this completed goal from view"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ) : !isCancelled ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                    <button
                      onClick={() => setEditingGoal({ ...goal, deadline: goal.deadline ? goal.deadline.split('T')[0] : '' })}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id, false)}
                      className="btn btn-sm"
                      style={{ color: '#ef4444', background: '#fee2e2', border: 'none' }}
                    >
                      Cancel Goal
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'var(--panel)', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: 'var(--ink)' }}>🎯 Set New Learning Goal</h2>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Course *
                  <select
                    value={form.courseId}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  >
                    {enrolledCourses.length === 0 && <option value="">No enrolled courses available</option>}
                    {enrolledCourses.map((c) => (
                      <option key={c.courseId || c.id} value={c.courseId || c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Goal Type *
                  <select
                    value={form.goalType}
                    onChange={(e) => {
                      const type = e.target.value;
                      const selected = GOAL_TYPES.find((g) => g.value === type);
                      setForm({ ...form, goalType: type, targetValue: selected ? selected.defaultTarget : 80 });
                    }}
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  >
                    {GOAL_TYPES.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Target Value ({form.goalType === 'COMPLETE_LESSONS_COUNT' ? 'lessons' : '%'}) *
                  <input
                    type="number"
                    min="1"
                    max={form.goalType === 'COMPLETE_LESSONS_COUNT' ? 500 : 100}
                    value={form.goalType === 'COMPLETE_COURSE' ? 100 : form.targetValue}
                    onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                    disabled={form.goalType === 'COMPLETE_COURSE'}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      marginTop: '4px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      backgroundColor: form.goalType === 'COMPLETE_COURSE' ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                      cursor: form.goalType === 'COMPLETE_COURSE' ? 'not-allowed' : 'text',
                      opacity: form.goalType === 'COMPLETE_COURSE' ? 0.75 : 1,
                    }}
                  />
                  {form.goalType === 'COMPLETE_COURSE' && (
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px', display: 'block', fontWeight: 400 }}>
                      🔒 Mục tiêu này luôn cố định là 100% (hoàn thành trọn vẹn khóa học).
                    </span>
                  )}
                </label>

                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  Target Deadline *
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Close
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Creating...' : 'Confirm Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingGoal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'var(--panel)', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: 'var(--ink)' }}>✏️ Edit Learning Goal</h2>
            <form onSubmit={handleUpdate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  New Target Value *
                  <input
                    type="number"
                    min="1"
                    max={editingGoal.goalType === 'COMPLETE_LESSONS_COUNT' ? 500 : 100}
                    value={editingGoal.goalType === 'COMPLETE_COURSE' ? 100 : editingGoal.targetValue}
                    onChange={(e) => setEditingGoal({ ...editingGoal, targetValue: e.target.value })}
                    disabled={editingGoal.goalType === 'COMPLETE_COURSE'}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      marginTop: '4px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      backgroundColor: editingGoal.goalType === 'COMPLETE_COURSE' ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                      cursor: editingGoal.goalType === 'COMPLETE_COURSE' ? 'not-allowed' : 'text',
                      opacity: editingGoal.goalType === 'COMPLETE_COURSE' ? 0.75 : 1,
                    }}
                  />
                  {editingGoal.goalType === 'COMPLETE_COURSE' && (
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px', display: 'block', fontWeight: 400 }}>
                      🔒 Mục tiêu này luôn cố định là 100% (hoàn thành trọn vẹn khóa học).
                    </span>
                  )}
                </label>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>
                  New Deadline *
                  <input
                    type="date"
                    value={editingGoal.deadline}
                    onChange={(e) => setEditingGoal({ ...editingGoal, deadline: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '8px', border: '1px solid var(--line)' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" onClick={() => setEditingGoal(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
