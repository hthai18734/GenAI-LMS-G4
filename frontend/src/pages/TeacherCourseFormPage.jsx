/**
 * Author: HuyTG - CE182405
 * Created at: 29/09/2026
 * Description: Course Management Form & Curriculum Workspace
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { materialService, discussionService } from '../features/learning/api.js';
import { getUser } from '../features/auth/api.js';
import { useToast } from '../components/toastContext';
import AuthenticatedVideo from '../shared/media/AuthenticatedVideo.jsx';
import MaterialAccessButton from '../features/learning/MaterialAccessButton.jsx';
import DiscussionPostEditor from '../components/DiscussionPostEditor';

const initial = { title: '', description: '', categoryId: '', thumbnail: '', duration: '' };
const initialLesson = { title: '', content: '', order: 1, duration: 0, videoRef: '', isPublished: true };
const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

const statusBadgeConfig = {
  DRAFT: { label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
  PENDING_REVIEW: { label: 'Pending Review', color: '#2563eb', bg: '#eff6ff' },
  APPROVED: { label: 'Approved', color: '#7c3aed', bg: '#f5f3ff' },
  PUBLIC: { label: 'Public / Live', color: '#059669', bg: '#ecfdf5' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' },
  ARCHIVED: { label: 'Archived', color: '#94a3b8', bg: '#f8fafc' },
};

export default function TeacherCourseFormPage() {
  const { courseId } = useParams();
  const isEdit = Boolean(courseId);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const currentUser = getUser();

  const [activeTab, setActiveTab] = useState(
    window.location.hash === '#lessons'
      ? 'lessons'
      : window.location.hash === '#activities'
      ? 'activities'
      : window.location.hash === '#discussions'
      ? 'discussions'
      : 'details'
  );

  const [form, setForm] = useState(initial);
  const [courseStatus, setCourseStatus] = useState('DRAFT');
  const [imageFile, setImageFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [lessonForm, setLessonForm] = useState(initialLesson);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [lessonErrors, setLessonErrors] = useState({});
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoFileName, setVideoFileName] = useState('');

  // Materials state
  const [activeMaterialLesson, setActiveMaterialLesson] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialFile, setMaterialFile] = useState(null);
  const [materialName, setMaterialName] = useState('');
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null); // { id, name, description }
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Discussions state
  const [discussions, setDiscussions] = useState([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [newThreadBody, setNewThreadBody] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [submittingThread, setSubmittingThread] = useState(false);
  const [replyTextMap, setReplyTextMap] = useState({});
  const [threadRepliesMap, setThreadRepliesMap] = useState({});
  const [loadingRepliesMap, setLoadingRepliesMap] = useState({});
  const [expandedThreadId, setExpandedThreadId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [savingPostEdit, setSavingPostEdit] = useState(false);

  const canEdit = !isEdit || ['DRAFT', 'REJECTED', 'APPROVED'].includes(courseStatus);

  const loadLessons = async () => {
    if (!isEdit) return;
    const result = await teacherService.getLessons(courseId);
    setLessons(result.data?.lessons || []);
  };

  const loadDiscussions = useCallback(async () => {
    if (!isEdit) return;
    setLoadingDiscussions(true);
    try {
      const res = await discussionService.getThreads(courseId);
      setDiscussions(res.data?.threads || res.threads || []);
    } catch {
      setDiscussions([]);
    } finally {
      setLoadingDiscussions(false);
    }
  }, [courseId, isEdit]);

  const loadThreadReplies = async (postId) => {
    setLoadingRepliesMap((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await discussionService.getThreadDetail(postId);
      setThreadRepliesMap((prev) => ({ ...prev, [postId]: res.data?.replies || [] }));
    } catch {
      setThreadRepliesMap((prev) => ({ ...prev, [postId]: [] }));
    } finally {
      setLoadingRepliesMap((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleReplies = async (postId) => {
    if (expandedThreadId === postId) {
      setExpandedThreadId(null);
      return;
    }
    setExpandedThreadId(postId);
    await loadThreadReplies(postId);
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThreadBody.trim()) return;
    setSubmittingThread(true);
    try {
      await discussionService.createThread(courseId, { title: newThreadTitle, body: newThreadBody });
      addToast('Discussion topic posted successfully!', 'success');
      setNewThreadTitle('');
      setNewThreadBody('');
      await loadDiscussions();
    } catch (err) {
      addToast(err.message || 'Failed to post discussion topic.', 'error');
    } finally {
      setSubmittingThread(false);
    }
  };

  const handleReplyThread = async (postId) => {
    const text = (replyTextMap[postId] || '').trim();
    if (!text) return;
    try {
      await discussionService.replyThread(postId, { body: text });
      addToast('Teacher reply posted successfully!', 'success');
      setReplyTextMap((prev) => ({ ...prev, [postId]: '' }));
      await loadThreadReplies(postId);
      setExpandedThreadId(postId);
      setDiscussions((prev) =>
        prev.map((t) => (t.id === postId ? { ...t, replyCount: (t.replyCount || 0) + 1 } : t))
      );
    } catch (err) {
      addToast(err.message || 'Failed to post reply.', 'error');
    }
  };

  const handleDeletePost = async (postId, parentId = null) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await discussionService.deletePost(postId);
      addToast('Post deleted.', 'success');
      if (parentId) {
        await loadThreadReplies(parentId);
        setDiscussions((prev) =>
          prev.map((t) => (t.id === parentId ? { ...t, replyCount: Math.max(0, (t.replyCount || 0) - 1) } : t))
        );
      } else {
        await loadDiscussions();
        setExpandedThreadId(null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete post.', 'error');
    }
  };

  const handleUpdatePost = async (event) => {
    event.preventDefault();
    const body = editingPost?.body.trim();
    if (!body) return;
    setSavingPostEdit(true);
    try {
      await discussionService.updatePost(editingPost.id, { body });
      if (editingPost.parentId) await loadThreadReplies(editingPost.parentId);
      else await loadDiscussions();
      setEditingPost(null);
      addToast('Discussion post updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update post.', 'error');
    } finally {
      setSavingPostEdit(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const categoryRes = await teacherService.getCategories();
        setCategories(categoryRes.data?.categories || []);
        if (isEdit) {
          const [courseRes, lessonRes, quizRes, assignmentRes] = await Promise.all([
            teacherService.getCourse(courseId),
            teacherService.getLessons(courseId),
            teacherService.listQuizzes(courseId),
            teacherService.listAssignments(courseId),
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
          const loadedLessons = lessonRes.data?.lessons || [];
          setLessons(loadedLessons);
          const requestedLessonId = new URLSearchParams(window.location.search).get('lessonId');
          const requestedLesson = loadedLessons.find(lesson => String(lesson._id) === requestedLessonId);
          if (requestedLesson) {
            setActiveTab('lessons');
            setEditingLessonId(requestedLesson._id);
            setLessonForm({ title: requestedLesson.title, content: requestedLesson.content, order: requestedLesson.order, duration: requestedLesson.duration || 0, videoRef: requestedLesson.videoRef || '', isPublished: requestedLesson.isPublished === true });
            setTimeout(() => document.getElementById('lesson-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
          }
          setQuizzes(quizRes.data?.quizzes || []);
          setAssignments(assignmentRes.data?.assignments || []);
          loadDiscussions();
        }
      } catch (err) {
        setError(err.message || 'Unable to load the course form.');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, isEdit, loadDiscussions]);

  useEffect(() => {
    if (isEdit && activeTab === 'discussions') {
      void Promise.resolve().then(loadDiscussions);
    }
  }, [activeTab, isEdit, loadDiscussions]);

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

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

  const handleSubmitForReview = async () => {
    if (lessons.length === 0) {
      addToast('Please add at least one lesson before submitting for review.', 'error');
      return;
    }
    setSaving(true);
    try {
      await teacherService.submitForReview(courseId);
      setCourseStatus('PENDING_REVIEW');
      addToast('Course submitted for Admin review successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Unable to submit course for review.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      let thumbnailUrl = form.thumbnail && !form.thumbnail.startsWith('blob:') ? form.thumbnail : null;
      if (imageFile) {
        const uploadRes = await teacherService.uploadThumbnail(imageFile);
        thumbnailUrl = uploadRes.data?.thumbnail || null;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        duration: form.duration === '' ? 0 : Number(form.duration),
        thumbnail: thumbnailUrl,
      };

      if (isEdit) {
        const result = await teacherService.updateCourse(courseId, payload);
        addToast('Course details updated successfully!', 'success');
        setCourseStatus(result.data?.course?.status || courseStatus);
      } else {
        const result = await teacherService.createCourse(payload);
        addToast('Course created successfully! Now add curriculum lessons.', 'success');
        navigate(`/teacher/courses/${result.data?.course?._id}/edit#lessons`);
      }
    } catch (err) {
      setError(err.message || 'Unable to save course.');
      setFieldErrors(err.errors || {});
    } finally {
      setSaving(false);
    }
  };

  const handleUploadVideo = async (file) => {
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      addToast('Maximum video file size is 200 MB.', 'error');
      return;
    }
    setUploadingVideo(true);
    try {
      const res = await teacherService.uploadLessonVideo(file);
      const videoUrl = res.data?.videoUrl;
      if (videoUrl) {
        setLessonForm((prev) => ({ ...prev, videoRef: videoUrl }));
        setVideoFileName(file.name);
        addToast('Video uploaded successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to upload video.', 'error');
    } finally {
      setUploadingVideo(false);
    }
  };

  const editLesson = (lesson) => {
    setEditingLessonId(lesson._id || lesson.id);
    setLessonForm({
      title: lesson.title,
      content: lesson.content,
      order: lesson.order,
      duration: lesson.duration || 0,
      videoRef: lesson.videoRef || '',
      isPublished: lesson.isPublished !== undefined ? Boolean(lesson.isPublished) : true,
    });
    setVideoFileName('');
    setLessonErrors({});
  };

  const resetLesson = () => {
    setEditingLessonId(null);
    setLessonForm({ ...initialLesson, order: lessons.length + 1, isPublished: true });
    setVideoFileName('');
    setLessonErrors({});
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    setSavingLesson(true);
    setLessonErrors({});
    try {
      const payload = {
        title: lessonForm.title.trim(),
        content: lessonForm.content.trim(),
        order: Number(lessonForm.order),
        duration: Number(lessonForm.duration || 0),
        videoRef: lessonForm.videoRef ? lessonForm.videoRef.trim() : null,
        isPublished: Boolean(lessonForm.isPublished),
      };
      if (editingLessonId) {
        await teacherService.updateLesson(courseId, editingLessonId, payload);
        addToast('Lesson updated successfully!', 'success');
      } else {
        await teacherService.createLesson(courseId, payload);
        addToast('Lesson added to curriculum!', 'success');
      }
      resetLesson();
      await loadLessons();
    } catch (err) {
      setLessonErrors(err.errors || { payload: err.message || 'Unable to save lesson.' });
    } finally {
      setSavingLesson(false);
    }
  };

  const deleteLesson = async (lesson) => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    try {
      const lessonId = lesson._id || lesson.id;
      await teacherService.deleteLesson(courseId, lessonId);
      addToast('Lesson deleted.', 'success');
      await loadLessons();
      if (editingLessonId === lessonId) resetLesson();
    } catch (err) {
      addToast(err.message || 'Unable to delete lesson.', 'error');
    }
  };

  const handleMoveLesson = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const newLessons = [...lessons];
    const [moved] = newLessons.splice(index, 1);
    newLessons.splice(targetIndex, 0, moved);

    const lessonIds = newLessons.map((l) => l._id || l.id);
    setReordering(true);
    try {
      await teacherService.reorderLessons(courseId, lessonIds);
      setLessons(newLessons.map((l, i) => ({ ...l, order: i + 1 })));
      addToast('Lesson order updated!', 'success');
    } catch (err) {
      addToast(err.message || 'Unable to reorder lessons.', 'error');
      await loadLessons();
    } finally {
      setReordering(false);
    }
  };

  const openMaterialsModal = async (lesson) => {
    setActiveMaterialLesson(lesson);
    setMaterials([]);
    setLoadingMaterials(true);
    try {
      const res = await materialService.getMaterials(lesson._id || lesson.id);
      setMaterials(res.data?.materials || res.materials || []);
    } catch (err) {
      addToast(err.message || 'Failed to load materials.', 'error');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!materialFile || !activeMaterialLesson) return;
    setUploadingMaterial(true);
    try {
      const lId = activeMaterialLesson._id || activeMaterialLesson.id;
      await materialService.uploadMaterial(lId, materialFile, { name: materialName });
      addToast('Material uploaded successfully!', 'success');
      setMaterialFile(null);
      setMaterialName('');
      const res = await materialService.getMaterials(lId);
      setMaterials(res.data?.materials || res.materials || []);
    } catch (err) {
      addToast(err.message || 'Failed to upload material.', 'error');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      await materialService.deleteMaterial(materialId);
      addToast('Material deleted.', 'success');
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch (err) {
      addToast(err.message || 'Failed to delete material.', 'error');
    }
  };

  const handleUpdateMaterial = async (e) => {
    e.preventDefault();
    if (!editingMaterial) return;
    const name = (editingMaterial.name || '').trim();
    if (!name) { addToast('Material name cannot be empty.', 'error'); return; }
    setSavingMaterial(true);
    try {
      await materialService.updateMaterial(editingMaterial.id, {
        name,
        description: (editingMaterial.description || '').trim(),
      });
      addToast('Material updated successfully.', 'success');
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === editingMaterial.id
            ? { ...m, name, description: (editingMaterial.description || '').trim() }
            : m
        )
      );
      setEditingMaterial(null);
    } catch (err) {
      addToast(err.message || 'Failed to update material.', 'error');
    } finally {
      setSavingMaterial(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const statusBadge = statusBadgeConfig[courseStatus] || { label: courseStatus, color: '#64748b', bg: '#f1f5f9' };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/teacher/courses"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--muted)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'color 0.2s',
          }}
        >
          <span>←</span> Back to My Courses
        </Link>
      </div>

      {/* Header Bar */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              {isEdit ? (canEdit ? 'Edit Course Workspace' : 'View Course') : 'Create New Course'}
            </h2>
            {isEdit && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: statusBadge.color,
                  background: statusBadge.bg,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ● {statusBadge.label}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
            {isEdit
              ? `Manage course details, curriculum lessons, and assessment activities for "${form.title || 'Untitled'}"`
              : 'Fill in the course basic information to start your curriculum draft.'}
          </p>
        </div>

        {isEdit && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to={`/teacher/courses/${courseId}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                fontSize: '13px',
                padding: '8px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
              }}
            >
              <span>👀</span> Student View Preview
            </Link>
          </div>
        )}
      </div>

      {/* Workspace Tabs (Only in Edit mode) */}
      {isEdit && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '24px',
            paddingBottom: '2px',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => { setActiveTab('details'); window.history.replaceState(null, '', '#details'); }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'details' ? '2px solid var(--purple)' : '2px solid transparent',
              color: activeTab === 'details' ? 'var(--purple)' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <span>📘 Course Details</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('lessons'); window.history.replaceState(null, '', '#lessons'); }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'lessons' ? '2px solid var(--purple)' : '2px solid transparent',
              color: activeTab === 'lessons' ? 'var(--purple)' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <span>📖 Lessons & Curriculum</span>
            <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '1px 8px', borderRadius: '10px' }}>
              {lessons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('activities'); window.history.replaceState(null, '', '#activities'); }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'activities' ? '2px solid var(--purple)' : '2px solid transparent',
              color: activeTab === 'activities' ? 'var(--purple)' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <span>📝 Quizzes & Assignments</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('discussions'); window.history.replaceState(null, '', '#discussions'); }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'discussions' ? '2px solid var(--purple)' : '2px solid transparent',
              color: activeTab === 'discussions' ? 'var(--purple)' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <span>💬 Discussions & Q&A</span>
            <span style={{ fontSize: '11px', background: '#ede9fe', color: '#7c3aed', padding: '1px 8px', borderRadius: '10px', fontWeight: 700 }}>
              {discussions.length}
            </span>
          </button>
        </div>
      )}

      {error && (
        <div className="page-error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* ── TAB 1: COURSE BASIC DETAILS ─────────────────────────────────── */}
      {(!isEdit || activeTab === 'details') && (
        <div className="profile-card-panel" style={{ padding: '28px' }}>
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="cTitle" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                Course Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="cTitle"
                disabled={!canEdit}
                name="title"
                value={form.title}
                onChange={change}
                maxLength={200}
                required
                placeholder="e.g. Modern Full-Stack Web Development with React & Node.js"
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

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="cDesc" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                Course Description <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                id="cDesc"
                disabled={!canEdit}
                name="description"
                value={form.description}
                onChange={change}
                rows={5}
                maxLength={5000}
                required
                placeholder="Describe what students will learn, target audience, and key prerequisites..."
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  border: fieldErrors.description ? '1px solid #ef4444' : '1px solid #e2e8f0',
                  padding: '12px 14px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              />
              {fieldErrors.description && <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.description}</small>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="cCategory" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                  Category
                </label>
                <select
                  id="cCategory"
                  disabled={!canEdit}
                  name="categoryId"
                  value={form.categoryId}
                  onChange={change}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '0 12px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.categoryId && <small style={{ color: '#ef4444', fontSize: '12px' }}>{fieldErrors.categoryId}</small>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="cDuration" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                  Estimated Duration (Hours)
                </label>
                <input
                  id="cDuration"
                  disabled={!canEdit}
                  name="duration"
                  value={form.duration}
                  onChange={change}
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="e.g. 12"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '0 14px',
                    fontSize: '14px',
                  }}
                />
                {fieldErrors.duration && <small style={{ color: '#ef4444', fontSize: '12px' }}>{fieldErrors.duration}</small>}
              </div>
            </div>

            {/* Thumbnail Upload Zone */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                Course Thumbnail Image
              </label>
              {canEdit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <label
                    className="btn btn-secondary"
                    style={{
                      cursor: 'pointer',
                      margin: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      padding: '8px 16px',
                    }}
                  >
                    <span>🖼️</span> Choose Image
                    <input
                      name="thumbnail"
                      onChange={selectImage}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Supported formats: JPEG, PNG, or WebP (max 5 MB)
                  </span>
                </div>
              )}

              {form.thumbnail && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginTop: '10px' }}>
                  <div
                    style={{
                      width: '240px',
                      height: '140px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <img
                      src={form.thumbnail}
                      alt="Thumbnail preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className="danger-button compact"
                      onClick={() => {
                        setImageFile(null);
                        setForm((current) => ({ ...current, thumbnail: null }));
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Remove Thumbnail
                    </button>
                  )}
                </div>
              )}
              {fieldErrors.thumbnail && <small style={{ color: '#ef4444', fontSize: '12px' }}>{fieldErrors.thumbnail}</small>}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              {canEdit && (
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ minWidth: '160px', height: '44px', fontWeight: 600 }}
                >
                  {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Course Draft'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/teacher/courses')}
                style={{ height: '44px', padding: '0 20px' }}
              >
                Back to Courses
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 2: LESSONS & CURRICULUM ─────────────────────────────────── */}
      {isEdit && activeTab === 'lessons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Lessons List Card */}
          <div className="profile-card-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
                  Curriculum Lessons ({lessons.length})
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  Organize your course structure. Reorder lessons with arrows or attach learning materials.
                </p>
              </div>
            </div>

            {lessons.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📖</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>No lessons added yet</div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
                  Add your first lesson below to start building your course curriculum.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#475569',
                          flexShrink: 0,
                        }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{lesson.title}</span>
                          {lesson.isPublished !== false ? (
                            <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                              ✓ Published
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                              Draft
                            </span>
                          )}
                          {lesson.videoRef && (
                            <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '10px' }}>
                              🎬 Video
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                          {lesson.duration || 0} minutes
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="ghost compact"
                          disabled={idx === 0 || reordering}
                          title="Move Up"
                          onClick={() => handleMoveLesson(idx, -1)}
                          style={{ padding: '4px 8px' }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="ghost compact"
                          disabled={idx === lessons.length - 1 || reordering}
                          title="Move Down"
                          onClick={() => handleMoveLesson(idx, 1)}
                          style={{ padding: '4px 8px' }}
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--purple)', fontWeight: 600, fontSize: '12px', padding: '5px 10px' }}
                          onClick={() => openMaterialsModal(lesson)}
                        >
                          📎 Materials
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                          onClick={() => editLesson(lesson)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-button compact"
                          style={{ fontSize: '12px', padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          onClick={() => deleteLesson(lesson)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add / Edit Lesson Form */}
          {canEdit && (
            <div id="lesson-editor" className="profile-card-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '17px', fontWeight: 700, margin: '0 0 16px', color: 'var(--ink)' }}>
                {editingLessonId ? '✏️ Edit Lesson' : '➕ Add New Lesson'}
              </h3>
              {lessonErrors.payload && <div className="page-error" style={{ marginBottom: '14px' }}>{lessonErrors.payload}</div>}

              <form onSubmit={saveLesson} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="lTitle" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                    Lesson Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="lTitle"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    maxLength={200}
                    required
                    placeholder="e.g. Introduction to Component Architecture"
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '10px',
                      border: lessonErrors.title ? '1px solid #ef4444' : '1px solid #e2e8f0',
                      padding: '0 14px',
                      fontSize: '14px',
                    }}
                  />
                  {lessonErrors.title && <small style={{ color: '#ef4444', fontSize: '12px' }}>{lessonErrors.title}</small>}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="lContent" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                    Lesson Content / Notes <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    id="lContent"
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                    rows={5}
                    required
                    placeholder="Enter lesson lecture notes, learning objectives, and summary..."
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      border: lessonErrors.content ? '1px solid #ef4444' : '1px solid #e2e8f0',
                      padding: '12px 14px',
                      fontSize: '14px',
                      lineHeight: 1.6,
                    }}
                  />
                  {lessonErrors.content && <small style={{ color: '#ef4444', fontSize: '12px' }}>{lessonErrors.content}</small>}
                </div>

                {/* Video Upload & URL */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '6px', display: 'block' }}>
                    Lesson Video (Upload Video or Link)
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <label
                      className="btn btn-secondary btn-sm"
                      style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      📁 {uploadingVideo ? 'Uploading video to server...' : 'Upload Video File (MP4, WebM...)'}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        disabled={uploadingVideo}
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await handleUploadVideo(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {lessonForm.videoRef && (
                      <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        ✓ Video attached {videoFileName ? `(${videoFileName})` : ''}
                        <button
                          type="button"
                          onClick={() => {
                            setLessonForm((prev) => ({ ...prev, videoRef: '' }));
                            setVideoFileName('');
                          }}
                          style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}
                          title="Remove video"
                        >
                          ✕ Remove
                        </button>
                      </span>
                    )}
                  </div>

                  <input
                    value={lessonForm.videoRef || ''}
                    onChange={(event) => {
                      setLessonForm({ ...lessonForm, videoRef: event.target.value });
                      setVideoFileName('');
                    }}
                    placeholder="Or paste video link (YouTube: https://youtu.be/... or MP4 URL)"
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '0 14px',
                      fontSize: '13px',
                    }}
                  />

                  {lessonForm.videoRef && (
                    <div style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        🎥 Video player preview:
                      </div>
                      {(() => {
                        const url = lessonForm.videoRef.trim();
                        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
                        if (isYouTube) {
                          let embedUrl = url;
                          const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
                          if (youtuBeMatch) embedUrl = `https://www.youtube.com/embed/${youtuBeMatch[1]}`;
                          else {
                            const ytMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
                            if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
                          }
                          return (
                            <iframe
                              title="Preview"
                              src={embedUrl}
                              style={{ width: '100%', height: '220px', borderRadius: '6px', border: 'none' }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          );
                        }
                        return (
                          <AuthenticatedVideo
                            src={url}
                            controls
                            style={{ width: '100%', maxHeight: '220px', borderRadius: '6px', background: '#000' }}
                          />
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="lOrder" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '4px', display: 'block' }}>
                      Lesson Sequence Order *
                    </label>
                    <input
                      id="lOrder"
                      type="number"
                      min="1"
                      step="1"
                      value={lessonForm.order}
                      onChange={(e) => setLessonForm({ ...lessonForm, order: e.target.value })}
                      style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 12px' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="lDuration" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', marginBottom: '4px', display: 'block' }}>
                      Lesson Duration (Minutes)
                    </label>
                    <input
                      id="lDuration"
                      type="number"
                      min="0"
                      value={lessonForm.duration}
                      onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                      style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="lPublished"
                    checked={Boolean(lessonForm.isPublished)}
                    onChange={(e) => setLessonForm({ ...lessonForm, isPublished: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--purple)' }}
                  />
                  <label htmlFor="lPublished" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', margin: 0 }}>
                    Publish this lesson (available to enrolled students)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={savingLesson}
                    className="btn btn-primary"
                    style={{ minWidth: '150px', height: '42px', fontWeight: 600 }}
                  >
                    {savingLesson ? 'Saving lesson...' : editingLessonId ? 'Update Lesson' : 'Add Lesson'}
                  </button>
                  {editingLessonId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetLesson}
                      style={{ height: '42px', padding: '0 18px' }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Submission Bar */}
          <div
            style={{
              padding: '20px 24px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>Ready for Student Enrollment?</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                Once you finish adding lessons, submit the course for administrator approval.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {['DRAFT', 'REJECTED'].includes(courseStatus) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || lessons.length === 0}
                  onClick={handleSubmitForReview}
                  style={{ fontWeight: 600, padding: '10px 22px', background: '#2563eb' }}
                >
                  🚀 Submit for Review
                </button>
              )}
              {courseStatus === 'PENDING_REVIEW' && (
                <span className="status-badge status-pending_review" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  ⏳ Pending Admin Review
                </span>
              )}
              {courseStatus === 'APPROVED' && (
                <span className="status-badge status-approved" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  ✓ Approved by Admin
                </span>
              )}
              {courseStatus === 'PUBLIC' && (
                <span className="status-badge status-public" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  🌐 Public to Students
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: QUIZZES & ASSIGNMENTS ─────────────────────────────────── */}
      {isEdit && activeTab === 'activities' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Card 1: Quizzes */}
          <div className="profile-card-panel" style={{ padding: '30px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#fff',
                  marginBottom: '16px',
                }}
              >
                📝
              </div>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: 'var(--ink)' }}>
                Course Quizzes
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Test student retention with automated multiple-choice quizzes attached to specific lessons or the entire course.
              </p>
              {quizzes.length > 0 && <div style={{ marginBottom: '16px' }}>{quizzes.map((quiz) => <button key={quiz._id} type="button" className="btn btn-secondary btn-sm" style={{ margin: '0 8px 8px 0' }} onClick={() => navigate(`/teacher/quizzes/${quiz._id}`)}>{quiz.title}</button>)}</div>}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/teacher/quizzes/new?courseId=${courseId}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '44px',
                fontWeight: 600,
              }}
            >
              <span>➕</span> Create New Quiz
            </button>
          </div>

          {/* Card 2: Assignments */}
          <div className="profile-card-panel" style={{ padding: '30px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#fff',
                  marginBottom: '16px',
                }}
              >
                📋
              </div>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: 'var(--ink)' }}>
                Course Assignments
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Assign hands-on practical exercises, coding problems, or essay questions for enrolled students.
              </p>
              {assignments.length > 0 && <div style={{ marginBottom: '16px' }}>{assignments.map((assignment) => <button key={assignment._id} type="button" className="btn btn-secondary btn-sm" style={{ margin: '0 8px 8px 0' }} onClick={() => navigate(`/teacher/assignments/${assignment._id}/edit?courseId=${courseId}`)}>{assignment.title}</button>)}</div>}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/teacher/assignments/new?courseId=${courseId}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '44px',
                fontWeight: 600,
              }}
            >
              <span>➕</span> Create New Assignment
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 4: STUDENT DISCUSSIONS & Q&A ───────────────────────── */}
      {isEdit && activeTab === 'discussions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Post Announcement / Question Form */}
          <div className="profile-card-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
              📢 Post Announcement or Discussion Topic
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px' }}>
              Start a new discussion topic or post announcements for all students enrolled in this course.
            </p>
            <form onSubmit={handleCreateThread} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Topic title (optional, e.g. 'Welcome to Module 2' or 'Office Hours Q&A')"
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
              />
              <textarea
                placeholder="Write your topic, announcement, or question here..."
                rows={3}
                required
                value={newThreadBody}
                onChange={(e) => setNewThreadBody(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submittingThread || !newThreadBody.trim()}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600 }}
                >
                  {submittingThread ? 'Posting...' : 'Post Topic as Teacher'}
                </button>
              </div>
            </form>
          </div>

          {/* Discussion List */}
          <div className="profile-card-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                💬 Course Questions & Discussions ({discussions.length})
              </h3>
              <button
                type="button"
                onClick={loadDiscussions}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px' }}
              >
                🔄 Refresh
              </button>
            </div>

            {loadingDiscussions ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading discussions...</p>
            ) : discussions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>💬</div>
                <h4 style={{ margin: '0 0 6px', color: 'var(--ink)' }}>No discussions yet</h4>
                <p style={{ fontSize: '13px', margin: 0 }}>
                  Students have not asked any questions in this course yet. Questions asked by students in the learning room will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {discussions.map((t) => {
                  const isExpanded = expandedThreadId === t.id;
                  const replies = threadRepliesMap[t.id] || [];
                  const loadingReplies = loadingRepliesMap[t.id];
                  const isAuthor = currentUser && String(t.author?.id) === String(currentUser._id || currentUser.id);

                  return (
                    <div
                      key={t.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        padding: '18px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Thread Author & Metadata */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                            👤 {t.author?.fullName || 'User'}
                          </span>
                          <span
                            className="badge"
                            style={{
                              fontSize: '10px',
                              background: t.author?.role === 'teacher' ? '#ede9fe' : '#e0e7ff',
                              color: t.author?.role === 'teacher' ? '#7c3aed' : '#2563eb',
                              fontWeight: 600,
                            }}
                          >
                            {t.author?.role === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
                          </span>
                        </div>

                        {isAuthor && t.status !== 'deleted' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" onClick={() => setEditingPost({ id: t.id, parentId: null, body: t.body })} className="ghost compact" style={{ fontSize: '12px' }}>
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDeletePost(t.id)} className="ghost compact" style={{ color: '#ef4444', fontSize: '12px' }} title="Delete this discussion thread">
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Title & Body */}
                      {t.title && (
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginBottom: '6px' }}>
                          {t.title}
                        </div>
                      )}
                      {editingPost?.id === t.id ? (
                        <DiscussionPostEditor
                          body={editingPost.body}
                          onBodyChange={(body) => setEditingPost((post) => ({ ...post, body }))}
                          onSave={handleUpdatePost}
                          onCancel={() => setEditingPost(null)}
                          saving={savingPostEdit}
                        />
                      ) : (
                        <div style={{ fontSize: '14px', color: t.status === 'deleted' ? 'var(--muted)' : '#334155', fontStyle: t.status === 'deleted' ? 'italic' : 'normal', lineHeight: 1.5, marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
                          {t.status === 'deleted' ? '[This post has been removed]' : t.body}
                        </div>
                      )}

                      {/* Expand / Hide Replies Toggle */}
                      {t.status !== 'deleted' && (
                        <button
                          type="button"
                          onClick={() => handleToggleReplies(t.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--purple)',
                            fontSize: '13px',
                            fontWeight: 600,
                            padding: '0',
                            marginBottom: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {isExpanded ? '🔼 Hide Replies' : '🔽 View Replies'}
                          {(t.replyCount || 0) > 0 && (
                            <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: '9999px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
                              {t.replyCount}
                            </span>
                          )}
                        </button>
                      )}

                      {/* Replies List */}
                      {isExpanded && (
                        <div
                          style={{
                            borderLeft: '3px solid #e0e7ff',
                            paddingLeft: '16px',
                            marginBottom: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          {loadingReplies ? (
                            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Loading replies...</p>
                          ) : replies.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                              No replies yet. Be the first to respond!
                            </p>
                          ) : (
                            replies.map((r) => {
                              const isReplyAuthor = currentUser && String(r.author?.id) === String(currentUser._id || currentUser.id);
                              return (
                                <div key={r.id} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: 600, fontSize: '13px' }}>👤 {r.author?.fullName || 'User'}</span>
                                      <span className="badge" style={{ fontSize: '9px', background: r.author?.role === 'teacher' ? '#ede9fe' : '#e0e7ff', color: r.author?.role === 'teacher' ? '#7c3aed' : '#2563eb' }}>
                                        {r.author?.role === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student'}
                                      </span>
                                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                                    </div>
                                    {isReplyAuthor && r.status !== 'deleted' && (
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button type="button" onClick={() => setEditingPost({ id: r.id, parentId: t.id, body: r.body })} className="ghost compact" style={{ fontSize: '11px' }}>Edit</button>
                                        <button type="button" onClick={() => handleDeletePost(r.id, t.id)} className="ghost compact" style={{ color: '#ef4444', fontSize: '11px' }} title="Delete reply">Delete</button>
                                      </div>
                                    )}
                                  </div>
                                  {editingPost?.id === r.id ? (
                                    <DiscussionPostEditor
                                      body={editingPost.body}
                                      onBodyChange={(body) => setEditingPost((post) => ({ ...post, body }))}
                                      onSave={handleUpdatePost}
                                      onCancel={() => setEditingPost(null)}
                                      saving={savingPostEdit}
                                    />
                                  ) : (
                                    <div style={{ fontSize: '13px', color: r.status === 'deleted' ? 'var(--muted)' : '#334155', fontStyle: r.status === 'deleted' ? 'italic' : 'normal', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                                      {r.status === 'deleted' ? '[Reply removed]' : r.body}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Reply Box as Teacher */}
                      {t.status !== 'deleted' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <input
                            type="text"
                            placeholder="Write an answer or reply to this student as Teacher..."
                            value={replyTextMap[t.id] || ''}
                            onChange={(e) => setReplyTextMap({ ...replyTextMap, [t.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReplyThread(t.id);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleReplyThread(t.id)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600 }}
                          >
                            👨‍🏫 Reply
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Materials Modal */}
      {activeMaterialLesson && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'var(--panel)', borderRadius: '16px', padding: '28px', maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                📎 Materials: {activeMaterialLesson.title}
              </h2>
              <button className="ghost compact" onClick={() => setActiveMaterialLesson(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Upload New Material (PDF, Docs, Slides, Zip...)</h3>
              <form onSubmit={handleUploadMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Material display name (optional)"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,.txt,.csv,.mp4,.webm,.png,.jpg,.jpeg,.webp"
                  required
                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '13px' }}
                />
                <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
                  Supported formats: PDF, Word, PowerPoint, Excel, Zip, Text, Images, MP4 (Max 25 MB).
                </small>
                <button type="submit" disabled={uploadingMaterial || !materialFile} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
                  {uploadingMaterial ? 'Uploading...' : 'Upload Material'}
                </button>
              </form>
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Attached Materials ({materials.length})</h3>
              {loadingMaterials ? (
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Loading materials...</p>
              ) : materials.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>No materials attached to this lesson yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {materials.map((m) => (
                    <div key={m.id} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {editingMaterial?.id === m.id ? (
                        <form onSubmit={handleUpdateMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✏️ Edit Material</div>
                          <input
                            type="text"
                            placeholder="Material name *"
                            value={editingMaterial.name}
                            required
                            onChange={(e) => setEditingMaterial((prev) => ({ ...prev, name: e.target.value }))}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px' }}
                          />
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            value={editingMaterial.description || ''}
                            onChange={(e) => setEditingMaterial((prev) => ({ ...prev, description: e.target.value }))}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" disabled={savingMaterial} className="btn btn-primary btn-sm" style={{ fontSize: '12px' }}>
                              {savingMaterial ? 'Saving...' : '✔ Save'}
                            </button>
                            <button type="button" onClick={() => setEditingMaterial(null)} className="btn btn-secondary btn-sm" style={{ fontSize: '12px' }}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>📄 {m.name}</div>
                            {m.description && (
                              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{m.description}</div>
                            )}
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                              {m.sizeBytes ? `${(m.sizeBytes / 1024).toFixed(1)} KB` : ''} • {m.mimeType || 'file'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => setEditingMaterial({ id: m.id, name: m.name, description: m.description || '' })}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                            >
                              ✏️ Edit
                            </button>
                            <MaterialAccessButton
                              materialId={m.id}
                              mode="view"
                              onError={(error) => addToast(error.message || 'Unable to view material.', 'error')}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '12px', padding: '4px 10px', textDecoration: 'none' }}
                            >
                              👁️ View
                            </MaterialAccessButton>
                            <MaterialAccessButton
                              materialId={m.id}
                              filename={m.originalName || m.name}
                              mode="download"
                              onError={(error) => addToast(error.message || 'Unable to download material.', 'error')}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '12px', padding: '4px 10px', textDecoration: 'none' }}
                            >
                              ⬇️ Download
                            </MaterialAccessButton>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="danger-button compact"
                              style={{ fontSize: '12px' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setActiveMaterialLesson(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
