/**
Author: HuyTG - CE182405
Created at: 29/09/2026
Description: Course Management
 */
import React, { useEffect, useState } from 'react';
import { adminService } from '../features/admin/api.js';
import { useToast } from '../components/Toast';

const labels = {
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ALL: 'All',
};

export default function AdminModerationPage() {
  const [status, setStatus] = useState('PENDING_REVIEW');
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const query = status === 'ALL' ? '' : `status=${status}`;
      const res = await adminService.getModerationCourses(query);
      setCourses(res.data?.courses || []);
    } catch (err) {
      setError(err.message || 'Unable to load moderation courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const select = async (id) => {
    try {
      const res = await adminService.getModerationCourse(id);
      setSelected(res.data?.course);
      setReason('');
    } catch (err) {
      addToast(err.message || 'Unable to load course details.', 'error');
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      await adminService.approveCourse(selected._id);
      addToast('Course approved successfully! Students can now access this course.', 'success');
      setSelected(null);
      await load();
    } catch (err) {
      addToast(err.message || 'Unable to approve course.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      addToast('Please enter a rejection reason.', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminService.rejectCourse(selected._id, reason.trim());
      addToast('Course rejected and feedback sent to instructor.', 'success');
      setSelected(null);
      await load();
    } catch (err) {
      addToast(err.message || 'Unable to reject course.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return <section className="management-page">
    <div className="management-header"><div><h1>Course Moderation</h1><p>Review, approve, or reject courses submitted by instructors.</p></div></div>
    <div className="tabs">{Object.entries(labels).map(([key, value]) => <button className={status === key ? 'active' : ''} onClick={() => setStatus(key)} key={key}>{value}</button>)}</div>
    {loading ? <div className="spinner" /> : error ? <div className="page-error">{error}<button className="ghost" onClick={load}>Retry</button></div> : courses.length === 0 ? <div className="empty-state management-card"><div className="empty-icon">✓</div><h3>No courses found in this status.</h3></div> : <div className="management-list">{courses.map((course) => <article className="management-card moderation-row" key={course._id}>
      <div><h2>{course.title}</h2><p>Instructor: {course.teacherId?.fullName || 'Unknown'} ({course.teacherId?.email || ''}) · Category: {course.category || 'Uncategorized'}</p><span className={`status-badge status-${course.status.toLowerCase()}`}>{labels[course.status] || course.status}</span></div>
      <button className="primary" onClick={() => select(course._id)}>View Details & Moderate</button>
    </article>)}</div>}
    {selected && <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal-card">
      <div className="modal-heading"><h2>Course Moderation Details</h2><button className="icon-button" onClick={() => setSelected(null)}>×</button></div>
      {selected.thumbnail && <img className="review-thumbnail" src={selected.thumbnail} alt="" />}
      <dl className="review-details">
        <div><dt>Course Title</dt><dd>{selected.title}</dd></div>
        <div><dt>Instructor</dt><dd>{selected.teacherId?.fullName || 'Unknown'} ({selected.teacherId?.email || 'No email'})</dd></div>
        <div><dt>Category</dt><dd>{selected.category || 'Uncategorized'}</dd></div>
        <div><dt>Duration</dt><dd>{selected.duration || 0} hours</dd></div>
        <div><dt>Description</dt><dd>{selected.description}</dd></div>
        <div><dt>Current Status</dt><dd><span className={`status-badge status-${selected.status.toLowerCase()}`}>{labels[selected.status] || selected.status}</span></dd></div>
      </dl>
      <h3>Course Lessons ({selected.lessons?.length || 0})</h3>
      {selected.lessons?.map((lesson) => <div key={lesson._id} className="management-card" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{lesson.order}. {lesson.title}</strong>
          {lesson.videoRef && <span style={{ fontSize: '12px', color: 'var(--purple)', fontWeight: 600 }}>🎬 Has Video</span>}
        </div>
        <p style={{ margin: '6px 0 0', whiteSpace: 'pre-line' }}>{lesson.content}</p>
        {lesson.videoRef && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>Video URL: {lesson.videoRef}</div>}
      </div>)}
      {selected.status === 'REJECTED' && selected.rejectionReason && <p className="rejection-note">Previous Rejection Reason: {selected.rejectionReason}</p>}
      {selected.status === 'PENDING_REVIEW' && <><label className="modal-label">Rejection Reason (if not approving) *<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="3" maxLength="1000" placeholder="Provide constructive feedback on what needs revision..." /></label><div className="form-actions"><button className="danger-button" disabled={busy} onClick={reject}>{busy ? 'Saving...' : 'Reject Course'}</button><button className="primary" disabled={busy} onClick={approve}>{busy ? 'Approving...' : 'Approve Course'}</button></div></>}
      {selected.status !== 'PENDING_REVIEW' && <div className="form-actions"><button className="ghost" onClick={() => setSelected(null)}>Close</button></div>}
    </div></div>}
  </section>;
}
