import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/Toast';

const initialForm = {
  courseId: '',
  lessonId: '',
  title: '',
  timeLimit: '15',
  passingScore: '70',
  attemptLimit: '1',
};

function validate(form) {
  const errors = {};
  if (!form.courseId) errors.courseId = 'Please select a course.';
  if (!form.title.trim()) errors.title = 'Quiz title is required.';
  if (!Number.isInteger(Number(form.timeLimit)) || Number(form.timeLimit) < 1) {
    errors.timeLimit = 'Enter a whole number greater than 0.';
  }
  if (!Number.isFinite(Number(form.passingScore)) || Number(form.passingScore) < 0 || Number(form.passingScore) > 100) {
    errors.passingScore = 'Enter a score between 0 and 100.';
  }
  if (!Number.isInteger(Number(form.attemptLimit)) || Number(form.attemptLimit) < 1) {
    errors.attemptLimit = 'Enter at least 1 attempt.';
  }
  return errors;
}

export default function TeacherQuizFormPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ ...initialForm, courseId: searchParams.get('courseId') || '' });
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { addToast } = useToast();
  const navigate = useNavigate();
  const courseBackPath = form.courseId ? `/teacher/courses/${form.courseId}/edit#activities` : '/teacher/courses';

  useEffect(() => {
    (async () => {
      try {
        const result = await teacherService.getCourses();
        const list = result.data?.courses || [];
        setCourses(list);
        if (!form.courseId && list.length > 0) {
          // Keep empty or leave for user to choose
        }
      } catch (err) {
        setError(err.message || 'Unable to load your courses.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!form.courseId) {
      setLessons([]);
      setQuizzes([]);
      return;
    }
    (async () => {
      setLoadingLessons(true);
      try {
        const [lessonResult, quizResult] = await Promise.all([
          teacherService.getLessons(form.courseId),
          teacherService.listQuizzes(form.courseId),
        ]);
        setLessons(lessonResult.data?.lessons || []);
        setQuizzes(quizResult.data?.quizzes || []);
      } catch (err) {
        setLessons([]);
        setQuizzes([]);
        setError(err.message || 'Unable to load lessons for this course.');
      } finally {
        setLoadingLessons(false);
      }
    })();
  }, [form.courseId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'courseId') setLessons([]);
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'courseId' ? { lessonId: '' } : {}),
    }));
    setFieldErrors((current) => ({ ...current, [name]: null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError('');
    try {
      const result = await teacherService.createQuiz(form.courseId, {
        title: form.title.trim(),
        lessonId: form.lessonId || null,
        timeLimit: Number(form.timeLimit),
        passingScore: Number(form.passingScore),
        attemptLimit: Number(form.attemptLimit),
      });
      const quiz = result.data?.quiz;
      addToast(result.message || 'Quiz created successfully!', 'success');
      navigate(quiz?._id ? `/teacher/quizzes/${quiz._id}` : '/teacher/courses');
    } catch (err) {
      setError(err.message || 'Unable to create quiz.');
      setFieldErrors(err.errors || {});
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
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#fff',
            boxShadow: '0 8px 16px rgba(139, 92, 246, 0.25)',
          }}
        >
          📝
        </div>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
            Create Course Quiz
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
            Design questions, set time limits, passing requirements, and attach the quiz to your course.
          </p>
        </div>
      </div>

      {error && (
        <div className="page-error" style={{ marginBottom: '20px' }}>
          {error}
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
              disabled={saving}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                border: fieldErrors.courseId ? '1px solid #ef4444' : '1px solid #e2e8f0',
                padding: '0 12px',
                fontSize: '14px',
              }}
            >
              <option value="">Select a course to attach this quiz</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} ({c.status})
                </option>
              ))}
            </select>
            {fieldErrors.courseId && <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.courseId}</small>}
          </div>

          {/* Related Lesson */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="lessonId" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
              Target Lesson (Optional)
            </label>
            <select
              id="lessonId"
              name="lessonId"
              value={form.lessonId}
              onChange={handleChange}
              disabled={saving || !form.courseId || loadingLessons}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '0 12px',
                fontSize: '14px',
                background: !form.courseId ? '#f8fafc' : '#fff',
              }}
            >
              <option value="">Course-level quiz (General assessment)</option>
              {lessons.map((l) => (
                <option key={l._id} value={l._id}>
                  Lesson {l.order}: {l.title}
                </option>
              ))}
            </select>
            {loadingLessons && <small style={{ color: 'var(--muted)', fontSize: '12px' }}>Loading lessons...</small>}
            {fieldErrors.lessonId && <small style={{ color: '#ef4444', fontSize: '12px' }}>{fieldErrors.lessonId}</small>}
          </div>

          {/* Quiz Title */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="title" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
              Quiz Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={200}
              disabled={saving}
              placeholder="e.g. Chapter 1 Mastery Check"
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

          {/* Assessment Parameters Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              background: '#f8fafc',
              padding: '18px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="timeLimit" style={{ fontWeight: 600, fontSize: '12px', color: '#475569', marginBottom: '4px', display: 'block' }}>
                ⏱️ Time Limit (Minutes) *
              </label>
              <input
                id="timeLimit"
                name="timeLimit"
                type="number"
                min="1"
                step="1"
                value={form.timeLimit}
                onChange={handleChange}
                disabled={saving}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: fieldErrors.timeLimit ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  padding: '0 10px',
                  background: '#fff',
                }}
              />
              {fieldErrors.timeLimit && <small style={{ color: '#ef4444', fontSize: '11px' }}>{fieldErrors.timeLimit}</small>}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="passingScore" style={{ fontWeight: 600, fontSize: '12px', color: '#475569', marginBottom: '4px', display: 'block' }}>
                🎯 Passing Score (%) *
              </label>
              <input
                id="passingScore"
                name="passingScore"
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.passingScore}
                onChange={handleChange}
                disabled={saving}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: fieldErrors.passingScore ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  padding: '0 10px',
                  background: '#fff',
                }}
              />
              {fieldErrors.passingScore && <small style={{ color: '#ef4444', fontSize: '11px' }}>{fieldErrors.passingScore}</small>}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="attemptLimit" style={{ fontWeight: 600, fontSize: '12px', color: '#475569', marginBottom: '4px', display: 'block' }}>
                🔄 Attempt Limit *
              </label>
              <input
                id="attemptLimit"
                name="attemptLimit"
                type="number"
                min="1"
                step="1"
                value={form.attemptLimit}
                onChange={handleChange}
                disabled={saving}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: fieldErrors.attemptLimit ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  padding: '0 10px',
                  background: '#fff',
                }}
              />
              {fieldErrors.attemptLimit && <small style={{ color: '#ef4444', fontSize: '11px' }}>{fieldErrors.attemptLimit}</small>}
            </div>
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
              {saving ? 'Creating quiz...' : 'Create & Open Workspace'}
            </button>
            <button
              type="button"
              onClick={() => navigate(courseBackPath)}
              className="btn btn-secondary"
              style={{ height: '44px', padding: '0 20px' }}
            >
              Back
            </button>
          </div>
        </form>
      </div>
      {form.courseId && <section className="profile-card-panel" style={{ padding: '30px', marginTop: '24px' }}>
        <h2 style={{ margin: '0 0 6px' }}>Existing quizzes</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--muted)' }}>Open a saved quiz to view and edit its questions.</p>
        {quizzes.length === 0 ? <div className="assessment-empty"><strong>No quizzes in this course yet.</strong><span>Create one using the form above or AI Content Studio.</span></div> : <div style={{ display: 'grid', gap: '12px' }}>
          {quizzes.map((quiz) => <article key={quiz._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div><strong style={{ display: 'block' }}>{quiz.title}</strong><small style={{ color: 'var(--muted)' }}>{quiz.lessonId ? `Linked lesson: ${lessons.find((lesson) => lesson._id === quiz.lessonId)?.title || 'Lesson'}` : 'Course-level quiz'} · {quiz.timeLimit} minutes · Pass {quiz.passingScore}%</small></div>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/teacher/quizzes/${quiz._id}`)}>Open workspace</button>
          </article>)}
        </div>}
      </section>}
    </div>
  );
}
