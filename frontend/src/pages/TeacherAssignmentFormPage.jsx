import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

  const { addToast } = useToast();
  const navigate = useNavigate();
  const courseBackPath = form.courseId ? `/teacher/courses/${form.courseId}/edit#activities` : '/teacher/courses';

  useEffect(() => {
    (async () => {
      try {
        const result = await teacherService.getCourses();
        setCourses(result.data?.courses || []);
      } catch (err) {
        setError(err.message || 'Unable to load your courses.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!requestedAssignmentId || form.courseId) return;
    teacherService.getAssignment(requestedAssignmentId)
      .then((result) => {
        const assignment = result.data?.assignment;
        if (!assignment) throw new Error('Assignment not found.');
        setEditingId(assignment._id);
        setForm(assignmentToForm(assignment));
      })
      .catch((err) => setError(err.message || 'Unable to load this assignment.'));
  }, [requestedAssignmentId, form.courseId]);

  useEffect(() => {
    if (!form.courseId) { setAssignments([]); setLessons([]); return; }
    Promise.all([
      teacherService.listAssignments(form.courseId),
      teacherService.getLessons(form.courseId),
      requestedAssignmentId ? teacherService.getAssignment(requestedAssignmentId) : Promise.resolve(null),
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
      .catch((err) => { setAssignments([]); setLessons([]); setError(err.message || 'Unable to load assignments for this course.'); });
  }, [form.courseId, requestedAssignmentId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value, ...(name === 'courseId' ? { lessonId: '' } : {}) }));
    setFieldErrors((current) => ({ ...current, [name]: null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateAssignmentForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError('');
    try {
      const payload = assignmentPayload(form);
      const result = editingId
        ? await teacherService.updateAssignment(editingId, payload)
        : await teacherService.createAssignment(form.courseId, payload);
      const assignment = result.data?.assignment;
      setCreated(assignment || { title: form.title.trim(), courseId: form.courseId });
      if (assignment) setAssignments((current) => editingId
        ? current.map(item => item._id === editingId ? assignment : item)
        : [assignment, ...current]);
      setForm((current) => ({ ...INITIAL_ASSIGNMENT_FORM, courseId: current.courseId }));
      setEditingId('');
      addToast(result.message || (editingId ? 'Assignment updated successfully!' : 'Assignment created successfully!'), 'success');
    } catch (err) {
      setError(err.message || 'Unable to create assignment.');
      setFieldErrors(err.errors || {});
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditingId('');
    setFieldErrors({});
    setForm((current) => ({ ...INITIAL_ASSIGNMENT_FORM, courseId: current.courseId }));
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
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(14, 165, 233, 0.25)',
          }}
        >
          📋
        </div>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
            {editingId ? 'Edit Course Assignment' : 'Create Course Assignment'}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
            Publish homework prompts, reading projects, or coding challenges for enrolled students.
          </p>
        </div>
      </div>

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
            <strong>✓ Assignment Created Successfully: </strong>
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
      <div className="profile-card-panel" style={{ padding: '30px' }}>
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
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

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
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
            {editingId && <button type="button" onClick={cancelEditing} disabled={saving} className="btn btn-secondary" style={{ height: '44px', padding: '0 20px' }}>Cancel Editing</button>}
            <button
              type="button"
              onClick={() => navigate(courseBackPath)}
              className="btn btn-secondary"
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate(`/teacher/assignments/${assignment._id}/edit?courseId=${form.courseId}`)} disabled={saving} style={{ padding: '7px 14px', flexShrink: 0 }}>Edit</button>
                <button type="button" className="btn btn-secondary" onClick={() => deleteAssignment(assignment)} disabled={saving} style={{ padding: '7px 14px', flexShrink: 0, color: '#dc2626' }}>Delete</button>
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
