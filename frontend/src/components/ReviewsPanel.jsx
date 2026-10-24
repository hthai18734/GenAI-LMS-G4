import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewService } from '../features/engagement/api.js';
import { studentService } from '../features/student/api.js';
import { useAuth } from '../features/auth/useAuth.js';
import { useToast } from './Toast';

export function StarRating({ value = 0, onChange, readOnly = false, size = '20px' }) {
  const [hover, setHover] = useState(0);
  const activeRating = hover || value || 0;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          style={{
            background: 'none',
            border: 'none',
            cursor: readOnly ? 'default' : 'pointer',
            padding: '2px',
            fontSize: size,
            lineHeight: 1,
            color: activeRating >= star ? '#f59e0b' : '#cbd5e1',
            transition: 'transform 0.15s ease, color 0.15s ease',
            transform: !readOnly && hover === star ? 'scale(1.25)' : 'none',
          }}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginLeft: '6px' }}>
        {value ? `${Number(value).toFixed(1)} / 5` : '0 / 5'}
      </span>
    </div>
  );
}

export default function ReviewsPanel({ scope = 'public', courseId, onRatingChange }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Enrolled courses for dropdown when student creates review from /reviews
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || '');

  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('view'); // 'view' | 'create' | 'edit' | 'delete' | 'reply'
  const [form, setForm] = useState({ rating: 5, content: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const currentId = String(user?.id || user?._id || '');

  // Load reviews
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const query = { page, limit: 10, search: filters.search };
        if (scope !== 'public' && filters.status) query.status = filters.status;
        const res = await reviewService.getReviews(scope, query, courseId);
        if (!cancelled) {
          setReviews(res.data.reviews || []);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [scope, courseId, page, filters, reload]);

  // Load enrolled courses for students if on /reviews page (where courseId is undefined)
  useEffect(() => {
    if (user?.role === 'student' && !courseId) {
      studentService.getEnrolledCourses()
        .then((res) => {
          const list = res.data?.courses || res.courses || [];
          setEnrolledCourses(list);
          if (list.length > 0 && !selectedCourseId) {
            setSelectedCourseId(list[0].courseId || list[0].id || list[0]._id);
          }
        })
        .catch(() => {});
    }
  }, [user, courseId]);

  const canEdit = (review) => {
    const revUserId = String(review.userId?._id || review.userId || '');
    return user?.role === 'student' && revUserId === currentId;
  };

  const canReply = (review) => {
    const teacherId = String(review.courseId?.teacherId || review.courseId?.instructorId || '');
    return user?.role === 'teacher' && teacherId === currentId;
  };

  // Find user's existing review for this specific course if courseId is provided
  const myCourseReview = courseId && user?.role === 'student'
    ? reviews.find((r) => String(r.userId?._id || r.userId) === currentId)
    : null;

  const open = async (review, nextMode = 'view') => {
    setFieldErrors({});
    if (!review) {
      setMode('create');
      setForm({ rating: 5, content: '' });
      setSelected({});
      if (courseId) {
        setSelectedCourseId(courseId);
      } else if (enrolledCourses.length > 0) {
        setSelectedCourseId(enrolledCourses[0].courseId || enrolledCourses[0].id || enrolledCourses[0]._id);
      }
      return;
    }

    setBusy(true);
    try {
      const res = await reviewService.getReview(nextMode === 'edit' || nextMode === 'delete' ? user.role : scope, review._id);
      const detail = res.data.review;
      setSelected(detail);
      setMode(nextMode);
      setForm(nextMode === 'reply'
        ? { content: detail.reply?.content || '' }
        : { rating: detail.rating, content: detail.content }
      );
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFieldErrors({});
    try {
      let res;
      if (mode === 'delete') {
        res = await reviewService.deleteReview(user.role, selected._id);
        if (onRatingChange) onRatingChange(res.data.averageRating);
        addToast(res.message || 'Review deleted.', 'success');
        setSelected(null);
        if (reviews.length === 1 && page > 1) setPage(page - 1);
        setReload((n) => n + 1);
        return;
      }

      if (mode === 'create') {
        const targetCourse = courseId || selectedCourseId;
        if (!targetCourse) {
          addToast('Please select a course to review.', 'error');
          setBusy(false);
          return;
        }
        res = await reviewService.createReview(targetCourse, {
          rating: Number(form.rating),
          content: form.content.trim(),
        });
      } else if (mode === 'edit') {
        res = await reviewService.updateReview(selected._id, {
          rating: Number(form.rating),
          content: form.content.trim(),
        });
      } else {
        res = await reviewService.replyToReview(selected._id, {
          content: form.content.trim(),
        });
      }

      if (onRatingChange && res.data?.review?.courseId?.averageRating !== undefined) {
        onRatingChange(res.data.review.courseId.averageRating);
      }
      addToast(res.message || 'Review saved successfully.', 'success');
      setSelected(null);
      setReload((n) => n + 1);
    } catch (err) {
      setFieldErrors(err.errors || {});
      addToast(err.message || 'Operation failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const moderate = async (review) => {
    const status = review.status === 'visible' ? 'hidden' : 'visible';
    setBusy(true);
    try {
      const res = await reviewService.moderateReview(review._id, status);
      if (onRatingChange && res.data?.review?.courseId?.averageRating !== undefined) {
        onRatingChange(res.data.review.courseId.averageRating);
      }
      addToast(res.message || 'Review status updated.', 'success');
      setReload((n) => n + 1);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="management-page" style={{ margin: '24px 0' }}>
      <div className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⭐</span>
            {scope === 'student' ? 'My Course Reviews' : 'Student Ratings & Reviews'}
          </h2>
          <p style={{ color: 'var(--text-dim, #64748b)', margin: '4px 0 0', fontSize: '14px' }}>
            {scope === 'student'
              ? 'View, rate, and manage your reviews for enrolled courses.'
              : scope === 'teacher'
              ? 'Read reviews for your courses and reply to student feedback.'
              : scope === 'admin'
              ? 'Moderate course reviews and manage visibility.'
              : 'Authentic student ratings and feedback from course participants.'}
          </p>
        </div>

        {/* Action button header */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user?.role === 'student' && (
            myCourseReview ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => open(myCourseReview, 'edit')}
                >
                  ✏️ Edit My Review
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  disabled={busy}
                  onClick={() => open(myCourseReview, 'delete')}
                >
                  🗑️ Delete Review
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => open(null, 'create')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <span>⭐</span> Write a Review
              </button>
            )
          )}

          {scope === 'public' && user?.role === 'student' && !courseId && (
            <Link to="/reviews" className="btn btn-secondary">
              My Reviews
            </Link>
          )}

          {scope === 'public' && !user && (
            <Link to="/login" className="btn btn-primary">
              Log in to write a review
            </Link>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form
        className="management-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setFilters({ ...filters, search: search.trim() });
        }}
        style={{ marginTop: '16px' }}
      >
        <input
          aria-label="Search reviews"
          placeholder="Search by review text or keywords..."
          maxLength={100}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className="ghost" type="submit">Search</button>
        {scope !== 'public' && (
          <select
            aria-label="Review status"
            value={filters.status}
            onChange={(event) => {
              setPage(1);
              setFilters({ ...filters, status: event.target.value });
            }}
          >
            <option value="">All statuses</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        )}
      </form>

      {/* Reviews Content */}
      {loading ? (
        <div className="spinner" style={{ margin: '40px auto' }} />
      ) : error ? (
        <div className="page-error" style={{ margin: '20px 0' }}>
          {error}
          <button className="ghost" onClick={() => setReload((n) => n + 1)}>Retry</button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="empty-state management-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
          <h3 style={{ margin: '0 0 8px' }}>No reviews found</h3>
          <p style={{ color: 'var(--text-dim, #64748b)', margin: '0 0 16px' }}>
            {courseId
              ? 'Be the first student to review and rate this course!'
              : scope === 'student'
              ? 'You have not submitted any reviews yet.'
              : 'There are no reviews matching your search criteria.'}
          </p>
          {scope === 'student' && !courseId && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => open(null, 'create')}
              >
                ⭐ Write a Review
              </button>
              <Link to="/courses" className="btn btn-secondary">
                View Enrolled Courses
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="management-card table-wrap">
          <table className="management-table">
            <thead>
              <tr>
                {!courseId && <th>Course</th>}
                <th>Student</th>
                <th>Rating</th>
                <th>Review Content</th>
                {scope !== 'public' && <th>Status</th>}
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => {
                const isMine = canEdit(review);
                return (
                  <tr key={review._id} style={{ background: isMine ? 'rgba(59, 130, 246, 0.04)' : undefined }}>
                    {!courseId && (
                      <td>
                        {review.courseId ? (
                          <Link to={`/courses/${review.courseId._id || review.courseId}`} style={{ fontWeight: 600, color: 'var(--primary, #3b82f6)' }}>
                            {review.courseId.title || 'Course'}
                          </Link>
                        ) : (
                          'Course unavailable'
                        )}
                      </td>
                    )}
                    <td>
                      <strong>{review.userId?.fullName || 'Anonymous student'}</strong>
                      {isMine && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '11px',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          You
                        </span>
                      )}
                    </td>
                    <td>
                      <StarRating value={review.rating} readOnly size="15px" />
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)' }}>
                        {review.content.slice(0, 160)}
                        {review.content.length > 160 ? '...' : ''}
                      </div>
                      {review.reply?.content && (
                        <div style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          background: 'var(--bg-subtle, #f1f5f9)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          borderLeft: '3px solid #3b82f6'
                        }}>
                          <strong>Teacher Reply:</strong> {review.reply.content.slice(0, 100)}
                        </div>
                      )}
                    </td>
                    {scope !== 'public' && (
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: review.status === 'visible' ? '#dcfce7' : '#fee2e2',
                          color: review.status === 'visible' ? '#166534' : '#991b1b',
                        }}>
                          {review.status}
                        </span>
                      </td>
                    )}
                    <td style={{ fontSize: '12px', color: 'var(--text-dim, #64748b)', whiteSpace: 'nowrap' }}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="form-actions" style={{ gap: '4px' }}>
                        <button
                          type="button"
                          className="ghost compact"
                          disabled={busy}
                          onClick={() => open(review, 'view')}
                        >
                          View
                        </button>
                        {isMine && (
                          <button
                            type="button"
                            className="ghost compact"
                            disabled={busy}
                            onClick={() => open(review, 'edit')}
                          >
                            Edit
                          </button>
                        )}
                        {(isMine || user?.role === 'admin') && (
                          <button
                            type="button"
                            className="ghost compact"
                            style={{ color: '#ef4444' }}
                            disabled={busy}
                            onClick={() => open(review, 'delete')}
                          >
                            Delete
                          </button>
                        )}
                        {canReply(review) && (
                          <button
                            type="button"
                            className="ghost compact"
                            disabled={busy}
                            onClick={() => open(review, 'reply')}
                          >
                            {review.reply?.content ? 'Edit Reply' : 'Reply'}
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            className="ghost compact"
                            disabled={busy}
                            onClick={() => moderate(review)}
                          >
                            {review.status === 'visible' ? 'Hide' : 'Show'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination && pagination.totalPages > 1 && (
        <div className="form-actions" style={{ marginTop: '16px', justifyContent: 'center' }}>
          <button className="ghost" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>Page {pagination.page} / {pagination.totalPages}</span>
          <button className="ghost" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* Modal Dialog for View / Create / Edit / Delete / Reply */}
      {selected && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title">
          <form className="modal-card" onSubmit={submit} style={{ maxWidth: '560px', width: '100%' }}>
            <div className="modal-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 id="review-dialog-title" style={{ margin: 0, fontSize: '20px' }}>
                {mode === 'create'
                  ? '⭐ Write Course Review'
                  : mode === 'edit'
                  ? '✏️ Update Your Review'
                  : mode === 'reply'
                  ? '💬 Reply to Review'
                  : mode === 'delete'
                  ? '🗑️ Delete Review'
                  : '👁️ Review Details'}
              </h2>
              <button
                type="button"
                className="icon-button"
                disabled={busy}
                aria-label="Close"
                onClick={() => setSelected(null)}
                style={{ fontSize: '22px', border: 'none', background: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* View Mode Details */}
            {mode === 'view' && (
              <dl className="review-details" style={{ display: 'grid', gap: '14px', margin: '0 0 20px' }}>
                <div>
                  <dt style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Student</dt>
                  <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>{selected.userId?.fullName || 'Anonymous student'}</dd>
                </div>
                <div>
                  <dt style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Course</dt>
                  <dd style={{ margin: '4px 0 0' }}>{selected.courseId?.title || 'Course unavailable'}</dd>
                </div>
                <div>
                  <dt style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Rating</dt>
                  <dd style={{ margin: '4px 0 0' }}>
                    <StarRating value={selected.rating} readOnly size="20px" />
                  </dd>
                </div>
                <div>
                  <dt style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Review Content</dt>
                  <dd style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: 'var(--bg-subtle, #f8fafc)', padding: '12px', borderRadius: '8px' }}>
                    {selected.content}
                  </dd>
                </div>
                <div>
                  <dt style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Submitted On</dt>
                  <dd style={{ margin: '4px 0 0', color: 'var(--text-dim)' }}>{new Date(selected.createdAt).toLocaleString()}</dd>
                </div>
                {selected.reply?.content && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                    <dt style={{ fontSize: '12px', color: '#1e40af', fontWeight: 700 }}>
                      Instructor Reply · {selected.reply.userId?.fullName || 'Teacher'}
                    </dt>
                    <dd style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{selected.reply.content}</dd>
                  </div>
                )}
              </dl>
            )}

            {/* Delete Mode Warning */}
            {mode === 'delete' && (
              <div style={{ marginBottom: '24px', lineHeight: '1.6' }}>
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '14px', borderRadius: '8px', marginBottom: '14px' }}>
                  ⚠️ <strong>Warning:</strong> This permanently deletes your rating and review. The overall course rating will be recalculated. This action cannot be undone.
                </div>
                <p>Are you sure you want to permanently delete this review?</p>
              </div>
            )}

            {/* Create & Edit Mode Form */}
            {(mode === 'create' || mode === 'edit' || mode === 'reply') && (
              <div style={{ display: 'grid', gap: '18px' }}>
                {mode === 'create' && !courseId && (
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                      Select Enrolled Course *
                    </label>
                    {enrolledCourses.length > 0 ? (
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)' }}
                      >
                        {enrolledCourses.map((c) => {
                          const cid = c.courseId || c.id || c._id;
                          return (
                            <option key={cid} value={cid}>
                              {c.title || c.course?.title || `Course ID: ${cid}`}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <p style={{ color: '#ef4444', fontSize: '13px' }}>
                        You do not have any enrolled courses to review. Please enroll in a course first.
                      </p>
                    )}
                  </div>
                )}

                {mode !== 'reply' && (
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                      Rating * <span style={{ fontWeight: 'normal', color: 'var(--text-dim)', fontSize: '12px' }}>(Click to rate from 1 to 5 stars)</span>
                    </label>
                    <div style={{ padding: '10px 14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)', display: 'inline-block' }}>
                      <StarRating
                        value={form.rating}
                        onChange={(rating) => setForm({ ...form, rating })}
                        size="28px"
                      />
                    </div>
                    {fieldErrors.rating && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{fieldErrors.rating}</div>}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                    {mode === 'reply' ? 'Reply to Student *' : 'Review & Feedback *'}
                  </label>
                  <textarea
                    required
                    rows={5}
                    maxLength={2000}
                    placeholder={mode === 'reply' ? 'Type your response to the student...' : 'Write your honest feedback about what you liked, course content, teacher explanation, etc.'}
                    value={form.content}
                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--line, #cbd5e1)',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: 'var(--text-dim)' }}>
                    <span>{fieldErrors.content ? <span style={{ color: '#ef4444' }}>{fieldErrors.content}</span> : '1 – 2000 characters'}</span>
                    <span>{form.content.length} / 2000</span>
                  </div>
                </div>

                {fieldErrors.payload && (
                  <div className="page-error" style={{ margin: 0 }}>{fieldErrors.payload}</div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Close
              </button>

              {mode !== 'view' && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: mode === 'delete' ? '#ef4444' : undefined,
                    borderColor: mode === 'delete' ? '#ef4444' : undefined,
                  }}
                  disabled={busy || (mode === 'create' && !courseId && enrolledCourses.length === 0)}
                >
                  {busy ? 'Processing...' : mode === 'delete' ? 'Confirm Delete' : 'Save Review'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
