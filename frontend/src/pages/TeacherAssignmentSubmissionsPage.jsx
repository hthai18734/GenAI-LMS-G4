import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';
import AssignmentAttachment from '../features/learning/AssignmentAttachment.jsx';
import AssessmentStatus from '../shared/assessment/AssessmentStatus.jsx';
import { submissionStatusOptions } from '../shared/assessment/status.js';
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
    <label>Status <select disabled={saving} value={status} onChange={e => { setStatus(e.target.value); setPage(1); setLoading(true); }}><option value="">All</option>{submissionStatusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    {loading ? <p role="status">Loading submissions…</p> : rows.length === 0 ? <p>No submissions match this filter.</p> : <div className="assessment-table-wrap"><table><thead><tr><th>Student</th><th>Submitted</th><th>Status</th><th>Score</th><th>Action</th></tr></thead><tbody>{rows.map(s => <tr key={s._id}><td>{s.studentId?.fullName || 'Student'}<br />{s.studentId?.email}</td><td>{new Date(s.submittedAt).toLocaleString()}</td><td><AssessmentStatus status={s.status} /></td><td>{s.score == null ? 'Ungraded' : `${s.score}/${s.maxScore}`}</td><td><button className="assessment-button" disabled={saving} onClick={() => open(s._id)}>View / Grade</button></td></tr>)}</tbody></table></div>}
    <p>{pagination.total} submissions · Page {page}</p><button className="assessment-button" disabled={saving || page <= 1} onClick={() => { setLoading(true); setPage(p => p - 1); }}>Previous</button> <button className="assessment-button" disabled={saving || page >= pagination.pages} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Next</button>
    {selected && <section className="assessment-panel assessment-detail" aria-label="Submission details"><h2>Submission details</h2><div className="assessment-saved-result" aria-live="polite" aria-atomic="true"><AssessmentStatus status={selected.status} />{selected.score != null && <strong>{selected.score}/{selected.maxScore}</strong>}</div><p>{selected.studentId?.fullName || 'Student'} · {selected.studentId?.email}</p><pre>{selected.answer || 'Submitted as a document. Open or download the file below.'}</pre>
      <AssignmentAttachment attachment={selected.attachment} url={`/api/teacher/assignment-submissions/${selected._id}/attachment`} />
      {assignment.maxScore == null ? <label>Result<select disabled={saving} value={passed ? 'passed' : 'not_passed'} onChange={e => setPassed(e.target.value === 'passed')}><option value="passed">Passed</option><option value="not_passed">Not passed</option></select></label> : <label>Score / {assignment.maxScore}<input type="number" min="0" max={assignment.maxScore} step="any" disabled={saving} value={score} onChange={e => setScore(e.target.value)} /></label>}
      <label>Feedback<textarea disabled={saving} value={feedback} maxLength={10000} onChange={e => setFeedback(e.target.value)} rows={5} /></label>
      <p>Saved grades and feedback are immediately visible to this student.</p>
      <div className="assessment-actions"><button className="assessment-button assessment-button-primary" disabled={saving || (assignment.maxScore != null && score === '')} onClick={() => save(false)}>{saving ? 'Saving…' : 'Save Grade and Feedback'}</button><button className="assessment-button" disabled={saving} onClick={() => save(true)}>Save Feedback Only</button><button className="assessment-button" disabled={saving} onClick={() => setSelected(null)}>Close</button></div>
    </section>}
  </div>;
}
