import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';

const statusConfig = {
  ALL: { label: 'All Courses' },
  DRAFT: { label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
  PENDING_REVIEW: { label: 'Pending Review', color: '#2563eb', bg: '#eff6ff' },
  APPROVED: { label: 'Approved', color: '#7c3aed', bg: '#f5f3ff' },
  PUBLIC: { label: 'Public / Live', color: '#059669', bg: '#ecfdf5' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' },
  ARCHIVED: { label: 'Archived', color: '#94a3b8', bg: '#f8fafc' },
};

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const { addToast, confirmToast } = useToast();
  const navigate = useNavigate();

  const loadCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await teacherService.getCourses();
      setCourses(result.data?.courses || []);
    } catch (err) {
      setError(err.message || 'Unable to load your courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadCourses);
  }, []);

  const mutate = async (course, action, message, confirmation) => {
    if (confirmation) {
      const options = typeof confirmation === 'string' ? { message: confirmation } : confirmation;
      const confirmed = await confirmToast(options.message, options);
      if (!confirmed) return;
    }
    setBusyId(course._id);
    try {
      await action(course._id);
      addToast(message, 'success');
      await loadCourses();
    } catch (err) {
      addToast(err.message || 'Unable to update course.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchTab = activeTab === 'ALL' || c.status === activeTab;
      const matchSearch =
        !searchTerm.trim() ||
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [courses, activeTab, searchTerm]);

  // Statistics
  const counts = useMemo(() => {
    return {
      total: courses.length,
      public: courses.filter((c) => c.status === 'PUBLIC').length,
      pending: courses.filter((c) => c.status === 'PENDING_REVIEW').length,
      draft: courses.filter((c) => c.status === 'DRAFT').length,
    };
  }, [courses]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            My Courses & Curriculum
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
            Design course lessons, attach quizzes and assignments, and submit courses for review.
          </p>
        </div>
        <Link
          to="/teacher/courses/new"
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
          }}
        >
          <span>➕</span> Create New Course
        </Link>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="profile-card-panel" style={{ padding: '16px 20px', margin: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            📚
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Total Courses</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>{counts.total}</div>
          </div>
        </div>

        <div className="profile-card-panel" style={{ padding: '16px 20px', margin: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            🌐
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Live & Public</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>{counts.public}</div>
          </div>
        </div>

        <div className="profile-card-panel" style={{ padding: '16px 20px', margin: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            ⏳
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Pending Review</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>{counts.pending}</div>
          </div>
        </div>

        <div className="profile-card-panel" style={{ padding: '16px 20px', margin: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            📝
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Drafting</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#64748b' }}>{counts.draft}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'PUBLIC', 'APPROVED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'ARCHIVED'].map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === 'ALL' ? courses.length : courses.filter((c) => c.status === tab).length;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid var(--purple)' : '1px solid #e2e8f0',
                  background: isActive ? 'var(--purple)' : '#fff',
                  color: isActive ? '#fff' : '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <span>{statusConfig[tab]?.label || tab}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isActive ? '#fff' : '#64748b',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ minWidth: '240px', maxWidth: '320px', width: '100%' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title or category..."
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {error && (
        <div className="page-error" style={{ marginBottom: '20px' }}>
          {error}
          <button className="ghost" onClick={loadCourses} style={{ marginLeft: '12px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && filteredCourses.length === 0 && (
        <div className="profile-card-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            {searchTerm || activeTab !== 'ALL' ? 'No matching courses found' : 'You have not created any courses yet'}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 20px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            {searchTerm || activeTab !== 'ALL'
              ? 'Try adjusting your search query or status filter.'
              : 'Create your first course to add lessons, upload video content, and create quizzes for students.'}
          </p>
          <Link to="/teacher/courses/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>➕</span> Create Course
          </Link>
        </div>
      )}

      {/* Course Cards Grid */}
      {filteredCourses.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredCourses.map((course) => {
            const busy = busyId === course._id;
            const editable = ['DRAFT', 'REJECTED', 'APPROVED'].includes(course.status);
            const canSubmit = ['DRAFT', 'REJECTED'].includes(course.status);
            const canArchive = ['DRAFT', 'REJECTED', 'APPROVED', 'PUBLIC'].includes(course.status);
            const statusInfo = statusConfig[course.status] || { label: course.status, color: '#64748b', bg: '#f1f5f9' };

            return (
              <div
                key={course._id}
                className="profile-card-panel"
                style={{
                  margin: 0,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  position: 'relative',
                  border: '1px solid #e2e8f0',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                <div>
                  {/* Top Header: Category & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--purple)',
                        background: '#f5f3ff',
                        padding: '3px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      🏷️ {course.category || 'General'}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: statusInfo.color,
                        background: statusInfo.bg,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ● {statusInfo.label}
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      fontSize: '17px',
                      fontWeight: 700,
                      color: 'var(--ink)',
                      margin: '0 0 8px',
                      lineHeight: 1.4,
                    }}
                  >
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      color: 'var(--muted)',
                      fontSize: '13px',
                      margin: '0 0 14px',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {course.description || 'No description provided.'}
                  </p>

                  {/* Meta Details */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      fontSize: '12px',
                      color: '#64748b',
                      padding: '8px 12px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    <span>⏱️ {course.duration || 0} hrs</span>
                    <span>📖 {course.lessonCount || 0} lessons</span>
                    <span>📅 {new Date(course.updatedAt).toLocaleDateString('en-US')}</span>
                  </div>

                  {/* Rejection / Incomplete Notice */}
                  {course.status === 'REJECTED' && course.rejectionReason && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', fontSize: '12px', color: '#b91c1c', marginBottom: '12px' }}>
                      <strong>Rejection reason:</strong> {course.rejectionReason}
                    </div>
                  )}

                  {canSubmit && !course.contentComplete && (
                    <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '12px', color: '#92400e', marginBottom: '12px' }}>
                      ⚠️ Add at least one valid lesson before submitting for review.
                    </div>
                  )}
                </div>

                {/* Course Embedded Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  {/* Primary Edit / View Button */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/courses/${course._id}/edit`)}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        fontSize: '13px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>✏️</span> {editable ? 'Manage Curriculum & Lessons' : 'View Course Content'}
                    </button>
                  </div>

                  {/* Course Attached Items (Quiz & Assignment Creation) */}
                  {editable && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/quizzes/new?courseId=${course._id}`)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                        title="Create Quiz attached to this course"
                      >
                        <span>📝</span> + Quiz
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/assignments/new?courseId=${course._id}`)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                        title="Create Assignment attached to this course"
                      >
                        <span>📋</span> + Assignment
                      </button>
                    </div>
                  )}

                  {/* Course Discussions & Preview Shortcuts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/courses/${course._id}/edit#discussions`)}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '12px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                      title="View student questions and discussions"
                    >
                      <span>💬</span> Discussions
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/courses/${course._id}/preview`)}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '12px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                      title="Preview student learning view"
                    >
                      <span>👀</span> Preview Course
                    </button>
                  </div>

                  {/* Lifecycle & Moderation Controls */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    {canSubmit && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy || !course.contentComplete}
                        onClick={() => mutate(course, teacherService.submitForReview, 'Course submitted for review.')}
                        style={{ flex: 1, fontSize: '12px', padding: '6px 10px', background: '#2563eb' }}
                      >
                        Submit Review
                      </button>
                    )}

                    {course.status === 'APPROVED' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => mutate(course, teacherService.publish, 'Course published successfully.')}
                        style={{ flex: 1, fontSize: '12px', padding: '6px 10px', background: '#059669' }}
                      >
                        Publish Live
                      </button>
                    )}

                    {course.status === 'PUBLIC' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => mutate(course, teacherService.unpublish, 'Course unpublished.')}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        Unpublish
                      </button>
                    )}

                    {canArchive && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() =>
                          mutate(course, teacherService.archive, 'Course archived.', {
                            message: 'Archive this course? It will no longer be visible to students.',
                            confirmLabel: 'Archive',
                          })
                        }
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        Archive
                      </button>
                    )}

                    {course.status === 'ARCHIVED' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() =>
                          mutate(course, teacherService.restore, 'Course restored to Draft.', {
                            message: 'Restore this course to Draft?',
                            confirmLabel: 'Restore',
                          })
                        }
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        Restore
                      </button>
                    )}

                    {course.status !== 'PENDING_REVIEW' && (
                      <button
                        type="button"
                        className="danger-button"
                        disabled={busy}
                        onClick={() =>
                          mutate(course, teacherService.deleteCourse, 'Course deleted.', {
                            message: 'Delete this course permanently? This cannot be undone.',
                            confirmLabel: 'Delete',
                            type: 'error',
                          })
                        }
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
