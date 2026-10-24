import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherService } from '../services/api';
import { useToast } from '../components/Toast';

const labels = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PUBLIC: 'Public',
  ARCHIVED: 'Archived',
};

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { addToast, confirmToast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await teacherService.getCourses();
      setCourses(result.data?.courses || []);
    } catch (err) {
      setError(err.message || 'Unable to load your courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const mutate = async (course, action, message, confirmation) => {
    if (confirmation) {
      const options = typeof confirmation === 'string' ? { message: confirmation } : confirmation;
      const confirmed = await confirmToast(options.message, options);
      if (!confirmed) return;
    }
    setBusyId(course._id);
    try {
      await action(course._id);
      addToast(message, 'success');
      await load();
    } catch (err) {
      addToast(err.message || 'Unable to update course.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="spinner" />;

  return <section className="management-page">
    <div className="management-header">
      <div><h1>My Courses</h1><p>Create course content, submit it for review, and publish approved courses.</p></div>
      <Link className="primary" to="/teacher/courses/new">Create Course</Link>
    </div>
    {error && <div className="page-error">{error}<button className="ghost" onClick={load}>Retry</button></div>}
    {!error && courses.length === 0 && <div className="empty-state management-card">
      <div className="empty-icon">📚</div><h3>You have not created any courses yet.</h3>
      <p>Start your first course and add at least one lesson before submitting it for review.</p>
      <Link className="primary empty-action" to="/teacher/courses/new">Create your first course</Link>
    </div>}
    {courses.length > 0 && <div className="management-list">{courses.map((course) => {
      const busy = busyId === course._id;
      const editable = ['DRAFT', 'REJECTED', 'APPROVED'].includes(course.status);
      const canSubmit = ['DRAFT', 'REJECTED'].includes(course.status);
      const canArchive = ['DRAFT', 'REJECTED', 'APPROVED', 'PUBLIC'].includes(course.status);
      return <article key={course._id} className="management-card course-management-card">
        <div className="course-management-main">
          <div className="course-title-row"><h2>{course.title}</h2><span className={`status-badge status-${course.status.toLowerCase()}`}>{labels[course.status] || course.status}</span></div>
          <p>{course.description || 'No description provided.'}</p>
          <div className="course-management-meta"><span>{course.category || 'Uncategorized'}</span><span>{course.duration || 0} hours</span><span>{course.lessonCount || 0} valid lesson(s)</span><span>Updated {new Date(course.updatedAt).toLocaleDateString()}</span></div>
          {course.status === 'REJECTED' && course.rejectionReason && <p className="rejection-note">Rejection reason: {course.rejectionReason}</p>}
          {canSubmit && !course.contentComplete && <p className="rejection-note">Add at least one lesson with a title and content before submitting.</p>}
        </div>
        <div className="management-actions">
          <button className="ghost" onClick={() => navigate(`/teacher/courses/${course._id}/edit`)}>{editable ? 'Edit' : 'View'}</button>
          {['DRAFT', 'REJECTED'].includes(course.status) && <button className="ghost" onClick={() => navigate(`/teacher/courses/${course._id}/edit#lessons`)}>Add Lesson</button>}
          {canSubmit && <button className="primary" disabled={busy || !course.contentComplete} onClick={() => mutate(course, teacherService.submitForReview, 'Course submitted for review.')}>Submit for Review</button>}
          {course.status === 'APPROVED' && <button className="primary" disabled={busy} onClick={() => mutate(course, teacherService.publish, 'Course published successfully.')}>Publish</button>}
          {course.status === 'PUBLIC' && <button className="ghost" disabled={busy} onClick={() => mutate(course, teacherService.unpublish, 'Course unpublished and returned to Approved.')}>Unpublish</button>}
          {canArchive && <button className="ghost" disabled={busy} onClick={() => mutate(course, teacherService.archive, 'Course archived.', { message: 'Archive this course? It will no longer be visible to students.', confirmLabel: 'Archive' })}>Archive</button>}
          {course.status === 'ARCHIVED' && <button className="primary" disabled={busy} onClick={() => mutate(course, teacherService.restore, 'Course restored to Draft.', { message: 'Restore this course to Draft?', confirmLabel: 'Restore' })}>Restore</button>}
          {course.status !== 'PENDING_REVIEW' && <button className="danger-button" disabled={busy} onClick={() => mutate(course, teacherService.deleteCourse, 'Course deleted.', { message: 'Delete this course? This cannot be undone from the management list.', confirmLabel: 'Delete', type: 'error' })}>Delete</button>}
        </div>
      </article>;
    })}</div>}
  </section>;
}
