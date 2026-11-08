import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AssignmentAttachment from '../features/learning/AssignmentAttachment.jsx';
import { ASSIGNMENT_FILE_ACCEPT, validateAssignmentFile } from '../shared/assignment/documents.js';
import {
  INITIAL_ASSIGNMENT_FORM,
  assignmentPayload,
  assignmentToForm,
  validateAssignmentForm,
} from '../features/teacher/assignmentModel.js';

export default function TeacherAssignmentFormPage() {
  const { assignmentId: routeAssignmentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const requestedAssignmentId = routeAssignmentId || searchParams.get('assignmentId') || '';
  const [form, setForm] = useState({ ...INITIAL_ASSIGNMENT_FORM, courseId: searchParams.get('courseId') || '' });
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [created, setCreated] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);

  const { addToast } = useToast();
  const navigate = useNavigate();
  const courseBackPath = form.courseId ? `/teacher/courses/${form.courseId}/edit#activities` : '/teacher/courses';

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const result = await teacherService.getCourses('', { signal: controller.signal });
        setCourses(result.data?.courses || []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Unable to load your courses.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!requestedAssignmentId || form.courseId) return;
    const controller = new AbortController();
    teacherService.getAssignment(requestedAssignmentId, { signal: controller.signal })
      .then((result) => {
        const assignment = result.data?.assignment;
        if (!assignment) throw new Error('Assignment not found.');
        setEditingId(assignment._id);
        setForm(assignmentToForm(assignment));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Unable to load this assignment.');
      });
    return () => controller.abort();
  }, [requestedAssignmentId, form.courseId]);

  useEffect(() => {
    if (!form.courseId) return;
    const controller = new AbortController();
    Promise.all([
      teacherService.listAssignments(form.courseId, { signal: controller.signal }),
      teacherService.getLessons(form.courseId, { signal: controller.signal }),
      requestedAssignmentId ? teacherService.getAssignment(requestedAssignmentId, { signal: controller.signal }) : Promise.resolve(null),
    ])
      .then(([assignmentResult, lessonResult, requestedResult]) => {
        const loadedAssignments = assignmentResult.data?.assignments || [];
        setAssignments(loadedAssignments); setLessons(lessonResult.data?.lessons || []);
        const requested = requestedResult?.data?.assignment;
        if (requested) {
          setEditingId(requested._id);
          setForm(assignmentToForm(requested, form.courseId));
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setAssignments([]); setLessons([]); setError(err.message || 'Unable to load assignments for this course.');
      });
    return () => controller.abort();
  }, [form.courseId, requestedAssignmentId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'courseId') {
      setAssignments([]);
      setLessons([]);
    }
    setForm((current) => ({ ...current, [name]: value, ...(name === 'courseId' ? { lessonId: '' } : {}) }));
    setFieldErrors((current) => ({ ...current, [name]: null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateAssignmentForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) { addToast('Check the highlighted fields before saving.', 'error'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = assignmentPayload(form);
      const result = editingId
        ? await teacherService.updateAssignment(editingId, payload, attachmentFile)
        : await teacherService.createAssignment(form.courseId, payload, attachmentFile);
      const assignment = result.data?.assignment;
      setCreated(assignment || { title: form.title.trim(), courseId: form.courseId });
      if (assignment) setAssignments((current) => editingId
        ? current.map(item => item._id === editingId ? assignment : item)
        : [assignment, ...current]);
      setForm((current) => ({ ...INITIAL_ASSIGNMENT_FORM, courseId: current.courseId }));
      setEditingId('');
      setAttachmentFile(null);
      addToast(result.message || (editingId ? 'Assignment updated successfully!' : 'Assignment created successfully!'), 'success');
    } catch (err) {
      setError(err.message || 'Unable to create assignment.');
      setFieldErrors(err.errors || {});
      addToast(err.message || 'Unable to save assignment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    navigate(courseBackPath);
  };

  const saveSettings = async () => {
    const errors = validateAssignmentForm(form); setFieldErrors(errors);
    if (Object.keys(errors).length) { addToast('Check the highlighted fields before saving.', 'error'); return; }
    setSaving(true); setError('');
    try {
      const { deadline, maxScore, passingScore } = assignmentPayload(form);
      const r = await teacherService.updateAssignment(editingId, { deadline, maxScore, passingScore });
      setAssignments(items => items.map(item => item._id === editingId ? r.data.assignment : item));
      addToast('Deadline and grading settings saved.', 'success');
    } catch (e) { setError(e.message); setFieldErrors(e.errors || {}); addToast(e.message, 'error'); } finally { setSaving(false); }
  };

  const deleteAssignment = async (assignment) => {
    if (!window.confirm(`Delete assignment "${assignment.title}"?`)) return;
    setSaving(true);
    setError('');
    try {
      const result = await teacherService.deleteAssignment(assignment._id);
      setAssignments((current) => current.filter((item) => item._id !== assignment._id));
      if (editingId === assignment._id) cancelEditing();
      addToast(result.message || 'Assignment deleted successfully.', 'success');
    } catch (err) {
      setError(err.message || 'Unable to delete assignment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="assessment-workspace assignment-editor" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to={courseBackPath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--muted)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <span>←</span> {form.courseId ? 'Back to Course Activities' : 'Back to My Courses'}
        </Link>
      </div>

      <header className="assessment-header"><div>
        <h1>{editingId ? 'Edit Assignment' : 'Create Assignment'}</h1>
        <p>Set the instructions, deadline and passing score. Attach a PDF or Word document if needed.</p>
      </div></header>

      {error && (
        <div className="page-error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {created && (
        <div
          style={{
            padding: '16px 20px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            color: '#065f46',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <strong>✓ Assignment Saved Successfully: </strong>
            <span>{created.title}</span>
          </div>

          <Link
            to="/teacher/courses"
            style={{ fontSize: '13px', fontWeight: 600, color: '#047857', textDecoration: 'underline' }}
          >
            View in My Courses →
          </Link>
        </div>
      )}

      {/* Main Card Form */}
      <div className="assessment-panel">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {editingId && <button type="button" className="assessment-button" disabled={saving} onClick={saveSettings}>Save Deadline and Scale Only (also available for live courses)</button>}
          <div className="form-group"><label htmlFor="assignment-deadline">Deadline (your local timezone; closes at this instant)</label><input id="assignment-deadline" type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} disabled={saving} />{fieldErrors.deadline && <p role="alert">{fieldErrors.deadline}</p>}</div>
          <div className="form-group"><label htmlFor="assignment-max">Maximum score (leave blank for legacy Passed / Not passed)</label><input id="assignment-max" type="number" min="0.000001" max="1000000" step="any" value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))} disabled={saving} />{fieldErrors.maxScore && <p role="alert">{fieldErrors.maxScore}</p>}</div>
          <div className="form-group"><label htmlFor="assignment-pass">Passing score (optional, on the same scale)</label><input id="assignment-pass" type="number" min="0" step="any" value={form.passingScore} onChange={e => setForm(f => ({ ...f, passingScore: e.target.value }))} disabled={saving} />{fieldErrors.passingScore && <p role="alert">{fieldErrors.passingScore}</p>}</div>
          {/* Target Course */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="courseId" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
              Target Course <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="courseId"
              name="courseId"
              value={form.courseId}
              onChange={handleChange}
              disabled={saving || Boolean(editingId)}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                border: fieldErrors.courseId ? '1px solid #ef4444' : '1px solid #e2e8f0',
                padding: '0 12px',
                fontSize: '14px',
              }}
            >
              <option value="">Select a course to attach this assignment</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} ({c.status})
                </option>
              ))}
            </select>
            {fieldErrors.courseId && <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.courseId}</small>}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="lessonId" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
              Related Lesson (Optional)
            </label>
            <select id="lessonId" name="lessonId" value={form.lessonId} onChange={handleChange} disabled={saving || !form.courseId} style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '0 12px', fontSize: '14px' }}>
              <option value="">Course-level assignment</option>
              {lessons.map((lesson) => <option key={lesson._id || lesson.id} value={lesson._id || lesson.id}>{lesson.order}. {lesson.title}</option>)}
            </select>
            <small style={{ display: 'block', color: 'var(--muted)', marginTop: '5px' }}>This changes only the lesson linked to the current assignment.</small>
          </div>

          {/* Assignment Title */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="title" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
              Assignment Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={200}
              disabled={saving}
              placeholder="e.g. Practical Exercise 1: Build a Responsive Layout"
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                border: fieldErrors.title ? '1px solid #ef4444' : '1px solid #e2e8f0',
                padding: '0 14px',
                fontSize: '14px',
              }}
            />
            {fieldErrors.title && <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.title}</small>}
          </div>

          {/* Assignment Content / Description */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="content" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
              Assignment Instructions & Requirements <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              id="content"
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={8}
              disabled={saving}
              placeholder="Provide clear instructions, submission criteria, deadlines, and learning outcomes for your students..."
              style={{
                width: '100%',
                borderRadius: '10px',
                border: fieldErrors.content ? '1px solid #ef4444' : '1px solid #e2e8f0',
                padding: '12px 14px',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            />
            {fieldErrors.content && <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.content}</small>}
          </div>

          <div className="form-group"><label htmlFor="assignment-prompt-file">Assignment document (optional)</label>
            <small>Attach one PDF, DOC or DOCX, up to 25 MB. A new file replaces the current document when you save.</small>
            {editingId && <AssignmentAttachment attachment={assignments.find(a => a._id === editingId)?.attachment} url={`/api/teacher/assignments/${editingId}/attachment`} />}
            <input key={`${editingId}-${attachmentFile ? 'selected' : 'empty'}`} id="assignment-prompt-file" type="file" accept={ASSIGNMENT_FILE_ACCEPT} disabled={saving} onChange={e => {
              const file = e.target.files?.[0]; try { validateAssignmentFile(file); setAttachmentFile(file || null); } catch (err) { addToast(err.message, 'error'); e.target.value = ''; }
            }} />
            {attachmentFile && <small>Selected: {attachmentFile.name} <button type="button" onClick={() => setAttachmentFile(null)}>Clear selection</button></small>}
          </div>
          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="submit"
              disabled={saving}
              className="assessment-button assessment-button-primary"
              style={{
                minWidth: '170px',
                height: '44px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {saving ? (editingId ? 'Saving changes...' : 'Creating assignment...') : editingId ? 'Save Assignment Changes' : 'Publish Assignment'}
            </button>
            {editingId && <button type="button" onClick={cancelEditing} disabled={saving} className="assessment-button" style={{ height: '44px', padding: '0 20px' }}>Cancel Editing</button>}
            <button
              type="button"
              onClick={() => navigate(courseBackPath)}
              className="assessment-button"
              style={{ height: '44px', padding: '0 20px' }}
            >
              Back to Course Activities
            </button>
          </div>
        </form>
      </div>
      {form.courseId && <section className="profile-card-panel" style={{ padding: '30px', marginTop: '24px' }}>
        <h2 style={{ margin: '0 0 6px' }}>Existing assignments</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--muted)' }}>Assignments already saved in the selected course.</p>
        {assignments.length === 0 ? <div className="assessment-empty"><strong>No assignments in this course yet.</strong><span>Create one above or use AI Content Studio.</span></div> : <div style={{ display: 'grid', gap: '14px' }}>
          {assignments.map((assignment) => <article key={assignment._id} style={{ padding: '18px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
              <strong>{assignment.title}</strong>
              <Link className="assessment-button" to={`/teacher/assignments/${assignment._id}/submissions`}>View submissions / Grade</Link>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="assessment-button" onClick={() => navigate(`/teacher/assignments/${assignment._id}/edit?courseId=${form.courseId}`)} disabled={saving} style={{ padding: '7px 14px', flexShrink: 0 }}>Edit</button>
                <button type="button" className="assessment-button" onClick={() => deleteAssignment(assignment)} disabled={saving} style={{ padding: '7px 14px', flexShrink: 0, color: '#dc2626' }}>Delete</button>
              </div>
            </div>
            <small style={{ display: 'block', marginBottom: '8px', color: '#4f46e5', fontWeight: 700 }}>{assignment.lessonId ? `Lesson: ${lessons.find((lesson) => (lesson._id || lesson.id) === String(assignment.lessonId))?.title || 'Linked lesson'}` : 'Course-level assignment'}</small>
            <div className="markdown-body" style={{ margin: 0, color: 'var(--muted)', maxHeight: '160px', overflow: 'auto' }}><ReactMarkdown remarkPlugins={[remarkGfm]}>{assignment.content}</ReactMarkdown></div>
          </article>)}
        </div>}
      </section>}
    </div>
  );
}
