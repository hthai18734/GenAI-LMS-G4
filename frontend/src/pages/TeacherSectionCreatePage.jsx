import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';

export default function TeacherSectionCreatePage() {
  const { courseId } = useParams();
  return <SectionForm key={courseId} courseId={courseId} />;
}
function SectionForm({ courseId }) {
  const navigate = useNavigate(), { addToast } = useToast();
  const [course, setCourse] = useState(null), [name, setName] = useState(''), [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { let active = true; teacherService.getCourse(courseId).then(r => { if (active) setCourse(r.data.course); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [courseId]);
  const editable = course && ['DRAFT', 'REJECTED', 'APPROVED'].includes(course.status);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await teacherService.createSection(courseId, { name: name.trim(), description: description.trim() });
      addToast('Section created successfully.', 'success');
      navigate(`/teacher/courses/${courseId}/edit#lessons`);
    } catch (err) { setError(err.message); addToast(err.message, 'error'); }
    finally { setBusy(false); }
  }
  return <div className="management-page assessment-workspace"><Link to={`/teacher/courses/${courseId}/edit#lessons`}>← Back to curriculum</Link><header className="assessment-header"><div><h1>Create Section</h1><p>{course?.title || 'Organize the lessons in your course.'}</p></div></header>
    {error && <p role="alert" className="page-error">{error}</p>}
    {course && !editable && <p role="status">Course content cannot be edited in its current status.</p>}
    <form className="assessment-panel assessment-form" onSubmit={submit}><label htmlFor="section-name">Name<input id="section-name" required maxLength={200} value={name} disabled={busy || !editable} onChange={e => setName(e.target.value)} placeholder="e.g. Introduction to machine learning" /></label>
      <label htmlFor="section-description">Description <span className="assessment-hint">Optional</span><textarea id="section-description" rows={5} maxLength={5000} value={description} disabled={busy || !editable} onChange={e => setDescription(e.target.value)} placeholder="What will students learn in this section?" /></label>
      <div className="assessment-actions"><button className="assessment-button assessment-button-primary" disabled={busy || !editable || !name.trim()}>{busy ? 'Creating…' : 'Create Section'}</button><Link to={`/teacher/courses/${courseId}/edit#lessons`}>Cancel</Link></div>
    </form></div>;
}
