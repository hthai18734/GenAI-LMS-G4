import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../features/student/api.js';
import { wishlistService, enrollmentService } from '../features/learning/api.js';
import { useToast } from '../components/Toast';
import ReviewsPanel from '../components/ReviewsPanel';

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState('enrolled');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [courseToEnrollmentMap, setCourseToEnrollmentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const [reviewModalCourse, setReviewModalCourse] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [enrolledRes, catalogRes, wishlistRes] = await Promise.all([
        studentService.getEnrolledCourses().catch(() => ({ data: { courses: [] } })),
        studentService.getCatalog().catch(() => ({ data: { courses: [] } })),
        wishlistService.getWishlist(1, 100).catch(() => ({ data: { courses: [] } })),
      ]);
      const enrolled = enrolledRes.data?.courses || [];
      const catalog = catalogRes.data?.courses || [];
      setEnrolledCourses(enrolled);
      setCatalogCourses(catalog);

      const mapping = {};
      enrolled.forEach((e) => {
        if (e.courseId && e.enrollmentId) {
          mapping[String(e.courseId)] = e.enrollmentId;
        }
      });
      setCourseToEnrollmentMap(mapping);

      const wishlisted = (wishlistRes.data?.courses || wishlistRes.courses || []).map((c) => String(c.id || c.courseId));
      setWishlistIds(new Set(wishlisted));
    } catch {
      addToast('Failed to load courses data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    try {
      await studentService.enrollCourse(courseId);
      addToast('Successfully enrolled in course!', 'success');
      await loadData();
      setActiveTab('enrolled');
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already enrolled')) {
        await loadData();
        setActiveTab('enrolled');
        return;
      }
      addToast(msg || 'Failed to enroll in course.', 'error');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleCancelEnrollment = async (enrollmentId) => {
    if (!enrollmentId) return;
    if (!window.confirm('Are you sure you want to cancel your enrollment for this course?')) return;
    try {

      await enrollmentService.cancelEnrollment(enrollmentId);
      addToast('Enrollment cancelled successfully.', 'success');
      await loadData();
    } catch (err) {
      addToast(err.message || 'Failed to cancel enrollment.', 'error');
    }
  };

  const handleToggleWishlist = async (e, courseId) => {
    e.stopPropagation();
    const isWishlisted = wishlistIds.has(String(courseId));
    try {
      if (isWishlisted) {
        await wishlistService.removeFromWishlist(courseId);
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(String(courseId));
          return next;
        });
        addToast('Removed from your wishlist.', 'info');
      } else {
        const res = await wishlistService.addToWishlist(courseId);
        if (res.alreadyEnrolled) {
          addToast('You are already enrolled in this course.', 'info');
          return;
        }
        setWishlistIds((prev) => new Set([...prev, String(courseId)]));
        addToast('Added to your wishlist!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update wishlist.', 'error');
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`btn ${activeTab === 'enrolled' ? 'btn-primary' : 'btn-secondary'}`}
        >
          📚 Enrolled Courses ({enrolledCourses.length})
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
        >
          🌐 Course Catalog ({catalogCourses.length})
        </button>
      </div>


      {/* Tab: Enrolled Courses */}
      {activeTab === 'enrolled' && (
        <div>
          {enrolledCourses.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6' }}>
              <div className="empty-icon">📖</div>
              <h3>No enrolled courses found</h3>
              <p>You haven't enrolled in any courses yet. Browse the catalog to find a course you'd like to learn!</p>
              <div style={{ marginTop: '16px' }}>
                <button onClick={() => setActiveTab('catalog')} className="btn btn-primary">
                  Explore Catalog
                </button>
              </div>
            </div>
          ) : (
            <div className="course-grid">
              {enrolledCourses.map((c) => (
                <div key={c.enrollmentId || c.courseId} className="course-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="course-thumb" style={{ position: 'relative' }}>
                    {c.thumbnail ? (
                      <img src={c.thumbnail} alt={c.title} />
                    ) : (
                      <span>📚</span>
                    )}
                    <button
                      type="button"
                      title={wishlistIds.has(String(c.courseId)) ? 'Remove from wishlist' : 'Save to wishlist'}
                      onClick={(e) => handleToggleWishlist(e, c.courseId)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '38px',
                        height: '38px',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        fontSize: '20px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                        zIndex: 10,
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1.0)'; }}
                    >
                      {wishlistIds.has(String(c.courseId)) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div className="course-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`badge badge-${c.enrollmentStatus}`}>
                        {c.enrollmentStatus}
                      </span>
                      {c.category && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                          {c.category}
                        </span>
                      )}
                    </div>
                    <h3 className="course-title">{c.title}</h3>
                    <p className="course-desc">{c.description || 'No description provided.'}</p>
                    <div className="progress-wrap">
                      <div
                        className="progress-fill"
                        style={{ width: `${c.progressPercent}%` }}
                      ></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span className="progress-text">{c.completedLessons} / {c.totalLessons} lessons</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--purple)' }}>{c.progressPercent}%</span>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/courses/${c.courseId}/learn`)}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, minWidth: '130px' }}
                      >
                        {c.progressPercent === 100 ? 'Review Lessons' : 'Resume Learning'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewModalCourse({ courseId: c.courseId, title: c.title })}
                        className="btn btn-secondary btn-sm"
                        style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Review and rate this course"
                      >
                        ⭐ Review & Rating
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelEnrollment(c.enrollmentId)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444', borderColor: '#fca5a5', whiteSpace: 'nowrap' }}
                        title="Cancel enrollment for this course"
                      >
                        Cancel
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Catalog Courses */}
      {activeTab === 'catalog' && (
        <div>
          {catalogCourses.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6' }}>
              <div className="empty-icon">🔍</div>
              <h3>No courses available in catalog</h3>
              <p>There are currently no open courses available for enrollment.</p>
            </div>
          ) : (
            <div className="course-grid">
              {catalogCourses.map((c) => (
                <div key={c.id} className="course-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="course-thumb" style={{ position: 'relative' }}>
                    {c.thumbnail ? (
                      <img src={c.thumbnail} alt={c.title} />
                    ) : (
                      <span>💡</span>
                    )}
                    <button
                      type="button"
                      title={wishlistIds.has(String(c.id)) ? 'Remove from wishlist' : 'Save to wishlist'}
                      onClick={(e) => handleToggleWishlist(e, c.id)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '38px',
                        height: '38px',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        fontSize: '20px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                        zIndex: 10,
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1.0)'; }}
                    >
                      {wishlistIds.has(String(c.id)) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div className="course-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="badge badge-active">{c.status}</span>
                      {c.category && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                          {c.category}
                        </span>
                      )}
                    </div>
                    <h3 className="course-title">{c.title}</h3>
                    <p className="course-desc">{c.description || 'No description provided.'}</p>
                    <div className="course-meta" style={{ marginBottom: '14px' }}>
                      <span>📖 {c.totalLessons} Lessons</span>
                      {c.duration ? <span>⏱ {c.duration} Hours</span> : null}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                      {c.isEnrolled ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <button
                            onClick={() => navigate(`/courses/${c.id}/learn`)}
                            className="btn btn-secondary btn-sm btn-full"
                          >
                            Enrolled · Learn Now
                          </button>
                          {courseToEnrollmentMap[c.id] && (
                            <button
                              type="button"
                              onClick={() => handleCancelEnrollment(courseToEnrollmentMap[c.id])}
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#ef4444', borderColor: '#fca5a5', whiteSpace: 'nowrap' }}
                              title="Cancel enrollment"
                            >
                              Cancel Enrollment
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEnroll(c.id)}
                            disabled={enrollingId === c.id}
                            className="btn btn-primary btn-sm btn-full"
                          >
                            {enrollingId === c.id ? 'Enrolling...' : 'Enroll in Course'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleToggleWishlist(e, c.id)}
                            className="btn btn-secondary btn-sm"
                            title={wishlistIds.has(String(c.id)) ? 'Remove from wishlist' : 'Save to wishlist'}
                            style={{ padding: '0 12px', fontSize: '16px' }}
                          >
                            {wishlistIds.has(String(c.id)) ? '❤️' : '🤍'}
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Course Review Modal */}
      {reviewModalCourse && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '850px', width: '92%', maxHeight: '88vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line, #e2e8f0)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>⭐ Rate & Review Course</h3>
                <span style={{ fontSize: '14px', color: 'var(--text-dim, #64748b)' }}>{reviewModalCourse.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalCourse(null)}
                style={{ fontSize: '26px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ReviewsPanel courseId={reviewModalCourse.courseId} />
          </div>
        </div>
      )}
    </div>
  );
}
