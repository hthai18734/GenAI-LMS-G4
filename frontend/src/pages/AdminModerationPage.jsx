import React, { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { useToast } from '../components/Toast';

const labels = { PENDING_REVIEW: 'Pending Review', APPROVED: 'Approved', REJECTED: 'Rejected' };

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
      const res = await adminService.getModerationCourses(`status=${status}`);
      setCourses(res.data?.courses || []);
    } catch (err) {
      setError(err.message || 'Unable to load moderation queue.');
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
      addToast(err.message || 'Unable to load course.', 'error');
    }
  };

  const approve = async () => {
    if (!selected || !window.confirm('Approve this course? The teacher will decide when to publish it.')) return;
    setBusy(true);
    try {
      await adminService.approveCourse(selected._id);
      addToast('Course approved. It is not public until the teacher publishes it.', 'success');
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
      addToast('A rejection reason is required.', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminService.rejectCourse(selected._id, reason.trim());
      addToast('Course rejected.', 'success');
      setSelected(null);
      await load();
    } catch (err) {
      addToast(err.message || 'Unable to reject course.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return <section className="management-page">
    <div className="management-header"><div><h1>Course Moderation</h1><p>Approve submitted courses without publishing them. Teachers control publication.</p></div></div>
    <div className="tabs">{Object.entries(labels).map(([key, value]) => <button className={status === key ? 'active' : ''} onClick={() => setStatus(key)} key={key}>{value}</button>)}</div>
    {loading ? <div className="spinner" /> : error ? <div className="page-error">{error}<button className="ghost" onClick={load}>Retry</button></div> : courses.length === 0 ? <div className="empty-state management-card"><div className="empty-icon">✓</div><h3>No courses found for this status.</h3></div> : <div className="management-list">{courses.map((course) => <article className="management-card moderation-row" key={course._id}>
      <div><h2>{course.title}</h2><p>Teacher: {course.teacherId?.fullName || 'Unknown'} · {course.category || 'Uncategorized'}</p><span className={`status-badge status-${course.status.toLowerCase()}`}>{labels[course.status] || course.status}</span></div>
      <button className="primary" onClick={() => select(course._id)}>View</button>
    </article>)}</div>}
    {selected && <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal-card">
      <div className="modal-heading"><h2>Review Course</h2><button className="icon-button" onClick={() => setSelected(null)}>×</button></div>
      {selected.thumbnail && <img className="review-thumbnail" src={selected.thumbnail} alt="" />}
      <dl className="review-details"><div><dt>Course</dt><dd>{selected.title}</dd></div><div><dt>Teacher</dt><dd>{selected.teacherId?.fullName || 'Unknown'} ({selected.teacherId?.email || 'No email'})</dd></div><div><dt>Category</dt><dd>{selected.category || 'Uncategorized'}</dd></div><div><dt>Duration</dt><dd>{selected.duration || 0} hours</dd></div><div><dt>Description</dt><dd>{selected.description}</dd></div></dl>
      <h3>Lessons ({selected.lessons?.length || 0})</h3>
      {selected.lessons?.map((lesson) => <div key={lesson._id} className="management-card"><strong>{lesson.order}. {lesson.title}</strong><p>{lesson.content}</p></div>)}
      {selected.status === 'REJECTED' && selected.rejectionReason && <p className="rejection-note">Rejection reason: {selected.rejectionReason}</p>}
      {selected.status === 'PENDING_REVIEW' && <><label className="modal-label">Rejection reason *<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="3" maxLength="1000" placeholder="Explain what needs to be improved…" /></label><div className="form-actions"><button className="danger-button" disabled={busy} onClick={reject}>{busy ? 'Saving…' : 'Reject'}</button><button className="primary" disabled={busy} onClick={approve}>{busy ? 'Saving…' : 'Approve'}</button></div></>}
    </div></div>}
  </section>;
}
