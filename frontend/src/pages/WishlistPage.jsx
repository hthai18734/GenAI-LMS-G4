import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wishlistService } from '../features/learning/api.js';
import { studentService } from '../features/student/api.js';
import { useToast } from '../components/toastContext';

export default function WishlistPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [actionInProgress, setActionInProgress] = useState({});
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadWishlist = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await wishlistService.getWishlist(p, 12);
      const data = res.data || res;
      setCourses(data.courses || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: (data.courses || []).length });
      setPage(p);
    } catch (err) {
      addToast(err.message || 'Unable to load wishlist courses.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void Promise.resolve().then(() => loadWishlist(1));
  }, [loadWishlist]);

  const handleRemove = async (courseId) => {
    setActionInProgress((prev) => ({ ...prev, [courseId]: 'removing' }));
    try {
      await wishlistService.removeFromWishlist(courseId);
      addToast('Removed course from your wishlist.', 'success');
      setCourses((prev) => prev.filter((c) => c.id !== courseId && c.courseId !== courseId));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      addToast(err.message || 'Failed to remove from wishlist.', 'error');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [courseId]: null }));
    }
  };

  const handleEnroll = async (courseId) => {
    setActionInProgress((prev) => ({ ...prev, [courseId]: 'enrolling' }));
    try {
      await studentService.enrollCourse(courseId);
      addToast('Enrolled successfully! Redirecting to course...', 'success');
      navigate(`/courses/${courseId}/learn`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already enrolled')) {
        navigate(`/courses/${courseId}/learn`);
        return;
      }
      addToast(msg || 'Failed to enroll in course.', 'error');
      setActionInProgress((prev) => ({ ...prev, [courseId]: null }));
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="wishlist-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '24px', margin: 0 }}>
            💖 My Wishlist
          </h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '14px' }}>
            Manage courses you plan to learn ({pagination.total || courses.length} {pagination.total === 1 ? 'course' : 'courses'})
          </p>
        </div>
        <button onClick={() => navigate('/courses')} className="btn btn-secondary btn-sm">
          📚 Explore Courses
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤍</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Your wishlist is empty</h3>
          <p style={{ color: 'var(--muted)', maxWidth: '420px', margin: '0 auto 20px', fontSize: '14px' }}>
            You have not saved any courses yet. Browse the course catalog to discover topics that interest you!
          </p>
          <button onClick={() => navigate('/courses')} className="btn btn-primary">
            Browse Course Catalog &rarr;
          </button>
        </div>
      ) : (
        <>
          <div className="course-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {courses.map((course) => {
              const cId = course.id || course.courseId;
              const isRemoving = actionInProgress[cId] === 'removing';
              const isEnrolling = actionInProgress[cId] === 'enrolling';

              return (
                <div key={cId} className="course-card" style={{ background: 'var(--panel)', borderRadius: '12px', border: '1px solid #eeeef6', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div className="course-thumb" style={{ height: '160px', background: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '36px' }}>📚</div>
                    )}
                    <button
                      onClick={() => handleRemove(cId)}
                      disabled={isRemoving}
                      title="Remove from wishlist"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                    >
                      {isRemoving ? '⏳' : '❌'}
                    </button>
                  </div>

                  <div className="course-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="badge" style={{ background: '#f3e8ff', color: '#7e22ce', fontSize: '11px', fontWeight: 600 }}>
                        {course.category?.name || course.category || 'General'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple)' }}>
                        {course.price && course.price > 0 ? `$${course.price}` : 'Free'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px', lineHeight: 1.4, flex: '0 0 auto' }}>
                      {course.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px', lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                      {course.description || 'No description provided.'}
                    </p>

                    <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span>👨‍🏫 {course.teacherName || 'Instructor'}</span>
                      {course.duration ? <span>⏱ {course.duration}h</span> : null}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button
                        onClick={() => handleEnroll(cId)}
                        disabled={isEnrolling}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                      >
                        {isEnrolling ? 'Enrolling...' : '🚀 Start Learning'}
                      </button>
                      <button
                        onClick={() => navigate(`/courses/${cId}`)}
                        className="btn btn-secondary btn-sm"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '28px' }}>
              <button
                disabled={page <= 1}
                onClick={() => loadWishlist(page - 1)}
                className="btn btn-secondary btn-sm"
              >
                &larr; Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', padding: '0 8px' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => loadWishlist(page + 1)}
                className="btn btn-secondary btn-sm"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
