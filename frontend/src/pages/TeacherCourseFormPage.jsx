import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teacherService } from '../services/api';
import { useToast } from '../components/Toast';

const initial = { title: '', description: '', categoryId: '', thumbnail: '', duration: '' };
const initialLesson = { title: '', content: '', order: 1, duration: 0 };
const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

export default function TeacherCourseFormPage() {
  const { courseId } = useParams();
  const isEdit = Boolean(courseId);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState(initial);
  const [courseStatus, setCourseStatus] = useState('DRAFT');
  const [imageFile, setImageFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonForm, setLessonForm] = useState(initialLesson);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [lessonErrors, setLessonErrors] = useState({});

  const canEdit = !isEdit || ['DRAFT', 'REJECTED', 'APPROVED'].includes(courseStatus);

  const loadLessons = async () => {
    if (!isEdit) return;
    const result = await teacherService.getLessons(courseId);
    setLessons(result.data?.lessons || []);
  };

  useEffect(() => {
    (async () => {
      try {
        const categoryRes = await teacherService.getCategories();
        setCategories(categoryRes.data?.categories || []);
        if (isEdit) {
          const [courseRes, lessonRes] = await Promise.all([
            teacherService.getCourse(courseId),
            teacherService.getLessons(courseId),
          ]);
          const course = courseRes.data?.course;
          setCourseStatus(course.status);
          setForm({
            title: course.title || '',
            description: course.description || '',
            categoryId: course.categoryId || '',
            thumbnail: course.thumbnail || '',
            duration: course.duration ?? '',
          });
          setLessons(lessonRes.data?.lessons || []);
        }
      } catch (err) {
        setError(err.message || 'Unable to load the course form.');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, isEdit]);

  const change = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const selectImage = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!supportedImageTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFieldErrors({ thumbnail: 'Choose a JPEG, PNG, or WebP image no larger than 5 MB.' });
      event.target.value = '';
      return;
    }
    setFieldErrors((current) => ({ ...current, thumbnail: null }));
    setImageFile(file);
    setForm((current) => ({ ...current, thumbnail: URL.createObjectURL(file) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      let thumbnail = form.thumbnail;
      if (imageFile) {
        const upload = await teacherService.uploadThumbnail(imageFile);
        thumbnail = upload.data?.thumbnail;
      }
      const payload = {
        ...form,
        thumbnail,
        categoryId: form.categoryId || null,
        duration: form.duration === '' ? 0 : Number(form.duration),
      };
      if (isEdit) {
        await teacherService.updateCourse(courseId, payload);
        addToast('Course updated successfully.', 'success');
      } else {
        const result = await teacherService.createCourse(payload);
        const createdId = result.data?.course?._id;
        addToast(
          'Course created as Draft. Add at least one lesson before submitting it for review.',
          'success',
        );
        navigate(createdId ? `/teacher/courses/${createdId}/edit#lessons` : '/teacher/courses');
      }
    } catch (err) {
      setError(err.message || 'Unable to save course.');
      setFieldErrors(err.errors || {});
    } finally {
      setSaving(false);
    }
  };

  const editLesson = (lesson) => {
    setEditingLessonId(lesson._id);
    setLessonForm({
      title: lesson.title,
      content: lesson.content,
      order: lesson.order,
      duration: lesson.duration || 0,
    });
    setLessonErrors({});
  };

  const resetLesson = () => {
    setEditingLessonId(null);
    setLessonForm({ ...initialLesson, order: lessons.length + 1 });
    setLessonErrors({});
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    setSavingLesson(true);
    setLessonErrors({});
    try {
      const payload = {
        ...lessonForm,
        order: Number(lessonForm.order),
        duration: Number(lessonForm.duration),
      };
      if (editingLessonId) await teacherService.updateLesson(courseId, editingLessonId, payload);
      else await teacherService.createLesson(courseId, payload);
      addToast(
        editingLessonId ? 'Lesson updated successfully.' : 'Lesson added successfully.',
        'success',
      );
      await loadLessons();
      resetLesson();
    } catch (err) {
      setLessonErrors(err.errors || { payload: err.message || 'Unable to save lesson.' });
    } finally {
      setSavingLesson(false);
    }
  };

  const deleteLesson = async (lesson) => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    try {
      await teacherService.deleteLesson(courseId, lesson._id);
      addToast('Lesson deleted successfully.', 'success');
      await loadLessons();
      if (editingLessonId === lesson._id) resetLesson();
    } catch (err) {
      addToast(err.message || 'Unable to delete lesson.', 'error');
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <section className="management-page">
      <div className="management-header">
        <div>
          <h1>{isEdit ? (canEdit ? 'Edit Course' : 'View Course') : 'Create Course'}</h1>
          <p>
            {isEdit
              ? `Current status: ${courseStatus}`
              : 'Create a Draft course, then add lessons before submitting it for review.'}
          </p>
        </div>
      </div>
      {error && <div className="page-error">{error}</div>}
      <form className="management-card course-form" onSubmit={submit} noValidate>
        <label>
          Course title *
          <input
            disabled={!canEdit}
            name="title"
            value={form.title}
            onChange={change}
            maxLength="200"
          />
          {fieldErrors.title && <small>{fieldErrors.title}</small>}
        </label>
        <label>
          Description *
          <textarea
            disabled={!canEdit}
            name="description"
            value={form.description}
            onChange={change}
            rows="6"
            maxLength="5000"
          />
          {fieldErrors.description && <small>{fieldErrors.description}</small>}
        </label>
        <div className="form-grid">
          <label>
            Category
            <select disabled={!canEdit} name="categoryId" value={form.categoryId} onChange={change}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option value={category._id} key={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && <small>{fieldErrors.categoryId}</small>}
          </label>
          <label>
            Duration (hours)
            <input
              disabled={!canEdit}
              name="duration"
              value={form.duration}
              onChange={change}
              type="number"
              min="0"
              step="0.25"
            />
            {fieldErrors.duration && <small>{fieldErrors.duration}</small>}
          </label>
        </div>
        {canEdit && (
          <label>
            Course thumbnail
            <input
              name="thumbnail"
              onChange={selectImage}
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <small className="image-help">JPEG, PNG, or WebP — maximum 5 MB.</small>
            {fieldErrors.thumbnail && <small>{fieldErrors.thumbnail}</small>}
          </label>
        )}
        {form.thumbnail && (
          <div className="thumbnail-preview">
            <img src={form.thumbnail} alt="Course thumbnail preview" />
            {canEdit && (
              <button
                className="ghost compact"
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setForm((current) => ({ ...current, thumbnail: null }));
                }}
              >
                Remove image
              </button>
            )}
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="ghost" onClick={() => navigate('/teacher/courses')}>
            Back
          </button>
          {canEdit && (
            <button className="primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Course'}
            </button>
          )}
        </div>
      </form>

      {isEdit && (
        <section id="lessons" className="management-card course-form">
          <div className="management-header">
            <div>
              <h2>Lessons</h2>
              <p>
                A course needs at least one lesson with a title and content before review or
                publication.
              </p>
            </div>
          </div>
          {lessons.length === 0 ? (
            <p>No lessons have been added.</p>
          ) : (
            <div className="management-list">
              {lessons.map((lesson) => (
                <article className="management-card moderation-row" key={lesson._id}>
                  <div>
                    <h3>
                      {lesson.order}. {lesson.title}
                    </h3>
                    <p>{lesson.content}</p>
                    <small>{lesson.duration || 0} minutes</small>
                  </div>
                  {canEdit && (
                    <div className="management-actions">
                      <button
                        className="ghost compact"
                        type="button"
                        onClick={() => editLesson(lesson)}
                      >
                        Edit
                      </button>
                      <button
                        className="danger-button compact"
                        type="button"
                        onClick={() => deleteLesson(lesson)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          {canEdit && (
            <form onSubmit={saveLesson} noValidate>
              <h3>{editingLessonId ? 'Edit Lesson' : 'Add Lesson'}</h3>
              {lessonErrors.payload && <div className="page-error">{lessonErrors.payload}</div>}
              <label>
                Lesson title *
                <input
                  value={lessonForm.title}
                  onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })}
                  maxLength="200"
                />
                {lessonErrors.title && <small>{lessonErrors.title}</small>}
              </label>
              <label>
                Lesson content *
                <textarea
                  value={lessonForm.content}
                  onChange={(event) =>
                    setLessonForm({ ...lessonForm, content: event.target.value })
                  }
                  rows="6"
                />
                {lessonErrors.content && <small>{lessonErrors.content}</small>}
              </label>
              <div className="form-grid">
                <label>
                  Order *
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={lessonForm.order}
                    onChange={(event) =>
                      setLessonForm({ ...lessonForm, order: event.target.value })
                    }
                  />
                  {lessonErrors.order && <small>{lessonErrors.order}</small>}
                </label>
                <label>
                  Duration (minutes)
                  <input
                    type="number"
                    min="0"
                    value={lessonForm.duration}
                    onChange={(event) =>
                      setLessonForm({ ...lessonForm, duration: event.target.value })
                    }
                  />
                  {lessonErrors.duration && <small>{lessonErrors.duration}</small>}
                </label>
              </div>
              <div className="form-actions">
                {editingLessonId && (
                  <button className="ghost" type="button" onClick={resetLesson}>
                    Cancel Edit
                  </button>
                )}
                <button className="primary" disabled={savingLesson}>
                  {savingLesson ? 'Saving…' : editingLessonId ? 'Update Lesson' : 'Add Lesson'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </section>
  );
}
