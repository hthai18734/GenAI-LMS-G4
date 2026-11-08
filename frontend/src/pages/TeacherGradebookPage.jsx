import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';
import { exportGradePdf } from '../features/teacher/gradeReport.js';
import AssessmentStatus from '../shared/assessment/AssessmentStatus.jsx';

export default function TeacherGradebookPage() {
  const { courseId } = useParams();
  return <GradebookWorkspace key={courseId} courseId={courseId} />;
}
function GradebookWorkspace({ courseId }) {
  const { addToast } = useToast();
  const [data, setData] = useState(null), [page, setPage] = useState(1);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    teacherService.getGradebook(courseId, `page=${page}&limit=20`, { signal: controller.signal })
      .then(r => { setData(r.data); setError(''); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [courseId, page]);
  async function action(work, message) {
    setBusy(true); setError('');
    try { await work(); addToast(message, 'success'); }
    catch (e) { setError(e.message); addToast(e.message, 'error'); }
    finally { setBusy(false); }
  }
  return <div className="management-page assessment-workspace">
    <Link to={`/teacher/courses/${courseId}/edit#activities`}>← Back to Course</Link>
    <header className="assessment-header"><div><h1>Course Gradebook</h1><p>{data?.course.title || 'Learning results and completion'}</p></div>
      <div className="assessment-actions">
        <button className="assessment-button" disabled={busy || loading} onClick={() => action(async () => {
          const r = await teacherService.getGradebook(courseId, `page=${page}&limit=20`); setData(r.data);
        }, 'Gradebook refreshed.')}>{busy ? 'Please wait…' : 'Refresh Results'}</button>
        <button className="assessment-button assessment-button-primary" disabled={busy || loading || !data} onClick={() => action(async () => {
          const r = await teacherService.getGradeReport(courseId); await exportGradePdf(r.data);
        }, 'Grade report downloaded.')}>Download Report (PDF)</button>
      </div>
    </header>
    <div className="assessment-note"><strong>One course completion result</strong><p>Students must complete all lessons and required videos, pass every quiz and pass every assignment. Scores use the latest submitted work. The same requirements apply to certificates.</p></div>
    {error && <p role="alert" className="page-error">{error}</p>}
    {loading && <p role="status">Loading results…</p>}
    {data && <>
      <div className="assessment-summary"><span><strong>{data.pagination.total}</strong> enrolled students</span><span><strong>{data.assessments.length}</strong> assessments</span><span>Attempt selection: <strong>Latest submitted</strong></span></div>
      {!data.rows.length ? <div className="assessment-empty">No enrolled students yet. Results will appear here after students enroll.</div> : <div><p className="assessment-table-hint">Swipe the table horizontally to see all results.</p><div className="assessment-table-wrap" role="region" aria-label="Course results, scroll horizontally for more columns" tabIndex={0}><table><caption className="sr-only">Latest scores and current course completion requirements</caption><thead><tr><th scope="col">Student</th><th scope="col">Lessons / Videos</th>{data.assessments.map(a => <th scope="col" key={a.key}>{a.title}<small>{a.type === 'quiz' ? 'Quiz' : 'Assignment'} · {a.passingScore == null ? a.maxScore == null ? 'Passed / Not passed' : 'Passing score not set' : `Pass ≥ ${a.passingScore}/${a.maxScore}`}</small></th>)}<th scope="col">Course completion</th></tr></thead>
        <tbody>{data.rows.map(row => <tr key={row.student.id}><th scope="row">{row.student.fullName || 'Student'}<small>{row.student.email}</small></th>
          <td>{row.result.byType.LESSON.completed}/{row.result.byType.LESSON.total}<small>completed</small></td>
          {row.cells.map((c, i) => <td key={c.key}>{c.score != null && <strong>{c.score}/{c.maxScore}</strong>}<AssessmentStatus status={c.state} />
            {data.assessments[i].type === 'assignment' && c.submissionId && <Link to={`/teacher/assignments/${data.assessments[i].id}/submissions`}>View / Grade</Link>}</td>)}
          <td><span className={`assessment-status ${row.result.eligibleToComplete ? 'is-passed' : 'is-pending'}`}>{row.result.eligibleToComplete ? 'Requirements met' : 'Incomplete'}</span>
            <small>{row.result.completedRequired}/{row.result.totalRequired} requirements met</small>
            {row.result.remainingActivities.length > 0 && <details><summary>What is missing?</summary><ul>{row.result.remainingActivities.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}</td>
        </tr>)}</tbody></table></div></div>}
      <nav className="assessment-pagination" aria-label="Gradebook pages"><span>Page {page} of {Math.max(1, data.pagination.pages)} · {data.pagination.total} students</span><div className="assessment-actions"><button className="assessment-button" disabled={page <= 1 || busy || loading} onClick={() => { setLoading(true); setPage(p => p - 1); }}>Previous</button><button className="assessment-button" disabled={page >= data.pagination.pages || busy || loading} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Next</button></div></nav>
    </>}
  </div>;
}
