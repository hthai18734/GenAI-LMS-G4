import { useEffect, useState } from 'react';
import { teacherService } from './api.js';
export default function CourseSections({ courseId, editable, value, onChange }) {
  const [sections, setSections] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    teacherService.getSections(courseId, { signal: controller.signal }).then(r => setSections(r.data.sections)).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [courseId]);
  return <div className="form-group">
    <label htmlFor="lesson-section">Section</label>
    <select id="lesson-section" value={value || ''} disabled={!editable} onChange={e => onChange(e.target.value)}>
      <option value="">General (legacy/default section)</option>
      {sections.map(s => <option key={s._id} value={s._id}>{s.order}. {s.title}</option>)}
    </select>
    {sections.find(s => String(s._id) === value)?.description && <small>{sections.find(s => String(s._id) === value).description}</small>}
    {error && <p role="alert" className="page-error">{error}</p>}
  </div>;
}
