import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';
import AssignmentAttachment from '../features/learning/AssignmentAttachment.jsx';
import AssessmentStatus from '../shared/assessment/AssessmentStatus.jsx';
import { submissionStatusOptions } from '../shared/assessment/status.js';
function StudentAvatar({ name }) {
  const initials = (() => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();
  return (
    <div
      style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '13px',
        flexShrink: 0,
        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.15)'
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export default function TeacherAssignmentSubmissionsPage() {
  const { assignmentId } = useParams();
  return <SubmissionWorkspace key={assignmentId} assignmentId={assignmentId} />;
}
function SubmissionWorkspace({ assignmentId }) {
  const { addToast } = useToast();
  const detailRequest = useRef(null);
  useEffect(() => () => detailRequest.current?.abort(), []);
  const [assignment, setAssignment] = useState(null), [rows, setRows] = useState([]), [pagination, setPagination] = useState({ total: 0 });
  const [page, setPage] = useState(1), [status, setStatus] = useState(''), [selected, setSelected] = useState(null);
  const [score, setScore] = useState(''), [feedback, setFeedback] = useState(''), [passed, setPassed] = useState(false);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([teacherService.getAssignment(assignmentId, { signal: controller.signal }), teacherService.getSubmissions(assignmentId, new URLSearchParams({ page, limit: 20, ...(status ? { status } : {}) }).toString(), { signal: controller.signal })])
      .then(([a, r]) => { setAssignment(a.data.assignment); setRows(r.data.submissions); setPagination(r.data.pagination); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [assignmentId, page, status, refresh]);
  async function open(id) {
    if (saving) return;
    setError('');
    setSelected(null);
    detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller;
    try {
      const r = await teacherService.getSubmission(id, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const s = r.data.submission;
      setSelected({ ...s, studentId: rows.find(row => row._id === id)?.studentId || s.studentId });
      setScore(s.score ?? ''); setFeedback(s.feedback || ''); setPassed(s.status === 'passed');
    }
    catch (e) { if (e.name !== 'AbortError') setError(e.message); }
  }
  async function save(onlyFeedback) {
    setSaving(true); setError('');
    try {
      const data = { feedback, revision: selected.revision || 0 };
      if (!onlyFeedback) Object.assign(data, assignment.maxScore == null ? { passed } : { score: score === '' ? null : Number(score) });
      const r = await (onlyFeedback ? teacherService.feedbackSubmission(selected._id, data) : teacherService.gradeSubmission(selected._id, data));
      setSelected(current => ({ ...r.data.submission, studentId: current.studentId })); setRefresh(r => r + 1);
      addToast(onlyFeedback ? 'Feedback saved successfully.' : 'Grade and feedback saved successfully.', 'success');
    } catch (e) { setError(e.message); addToast(e.message, 'error'); } finally { setSaving(false); }
  }
  return <div className="management-page assessment-workspace">
    {assignment && <Link className="assessment-button" to={`/teacher/courses/${assignment.courseId}/edit#activities`}><span aria-hidden="true">←</span> Back to Course Activities</Link>}
    <header className="assessment-header"><div><h1>Assignment Submissions</h1>{assignment && <h2 className="assessment-subtitle">{assignment.title}</h2>}</div>
      {assignment && <Link className="assessment-button assessment-button-primary" to={`/teacher/courses/${assignment.courseId}/gradebook`}>Open Course Gradebook <span aria-hidden="true">→</span></Link>}
    </header>
    {assignment && <p>Deadline: {assignment.deadline ? new Date(assignment.deadline).toLocaleString() : 'No deadline'} · Scale: {assignment.maxScore ?? 'Passed / Not passed'}{assignment.passingScore != null && ` · Passing score: ${assignment.passingScore}/${assignment.maxScore}`}</p>}
    {error && <p role="alert" className="page-error">{error}</p>}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBlock: '16px' }}>
      <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
        <span>Status</span>
        <select
          style={{ width: 'auto', minWidth: '180px', maxWidth: '240px', minHeight: '38px', height: '38px', padding: '6px 12px' }}
          disabled={saving}
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); setLoading(true); }}
        >
          <option value="">All</option>
          {submissionStatusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </div>
    {loading ? <p role="status">Loading submissions…</p> : rows.length === 0 ? <p>No submissions match this filter.</p> : (
      <div className="assessment-table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ verticalAlign: 'middle', width: '32%', minWidth: '220px' }}>Student</th>
              <th style={{ verticalAlign: 'middle', width: '22%', minWidth: '160px' }}>Submitted</th>
              <th style={{ verticalAlign: 'middle', width: '18%', minWidth: '140px' }}>Status</th>
              <th style={{ verticalAlign: 'middle', width: '14%', minWidth: '100px' }}>Score</th>
              <th style={{ verticalAlign: 'middle', width: '14%', minWidth: '120px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s._id}>
                <td style={{ verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StudentAvatar name={s.studentId?.fullName} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', lineHeight: 1.3 }}>
                        {s.studentId?.fullName || 'Student'}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                        {s.studentId?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '13.5px' }}>
                      {new Date(s.submittedAt).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(s.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <AssessmentStatus status={s.status} />
                </td>
                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  {s.score == null ? (
                    <span style={{ color: '#94a3b8', fontSize: '13.5px', fontStyle: 'italic' }}>Ungraded</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{s.score}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>/ {s.maxScore ?? assignment?.maxScore}</span>
                    </div>
                  )}
                </td>
                <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  <button
                    className="assessment-button"
                    style={{
                      minHeight: '34px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#4338ca',
                      borderColor: '#c7d2fe',
                      background: '#eef2ff'
                    }}
                    disabled={saving}
                    onClick={() => open(s._id)}
                  >
                    View / Grade
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    <div className="assessment-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
      <span>{pagination.total} submission{pagination.total === 1 ? '' : 's'} · Page {page}</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="assessment-button" style={{ minHeight: '34px', padding: '6px 14px' }} disabled={saving || page <= 1} onClick={() => { setLoading(true); setPage(p => p - 1); }}>Previous</button>
        <button className="assessment-button" style={{ minHeight: '34px', padding: '6px 14px' }} disabled={saving || page >= pagination.pages} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Next</button>
      </div>
    </div>
    {selected && <section className="assessment-panel assessment-detail" aria-label="Submission details"><h2>Submission details</h2><div className="assessment-saved-result" aria-live="polite" aria-atomic="true"><AssessmentStatus status={selected.status} />{selected.score != null && <strong>{selected.score}/{selected.maxScore}</strong>}</div><p>{selected.studentId?.fullName || 'Student'} · {selected.studentId?.email}</p><pre>{selected.answer || 'Submitted as a document. Open or download the file below.'}</pre>
      <AssignmentAttachment attachment={selected.attachment} url={`/api/teacher/assignment-submissions/${selected._id}/attachment`} />
      {assignment.maxScore == null ? <label>Result<select disabled={saving} value={passed ? 'passed' : 'not_passed'} onChange={e => setPassed(e.target.value === 'passed')}><option value="passed">Passed</option><option value="not_passed">Not passed</option></select></label> : <label>Score / {assignment.maxScore}<input type="number" min="0" max={assignment.maxScore} step="any" disabled={saving} value={score} onChange={e => setScore(e.target.value)} /></label>}
      <label>Feedback<textarea disabled={saving} value={feedback} maxLength={10000} onChange={e => setFeedback(e.target.value)} rows={5} /></label>
      <p>Saved grades and feedback are immediately visible to this student.</p>
      <div className="assessment-actions"><button className="assessment-button assessment-button-primary" disabled={saving || (assignment.maxScore != null && score === '')} onClick={() => save(false)}>{saving ? 'Saving…' : 'Save Grade and Feedback'}</button><button className="assessment-button" disabled={saving} onClick={() => save(true)}>Save Feedback Only</button><button className="assessment-button" disabled={saving} onClick={() => setSelected(null)}>Close</button></div>
    </section>}
  </div>;
}
