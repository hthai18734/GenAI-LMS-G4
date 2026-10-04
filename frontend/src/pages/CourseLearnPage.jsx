import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { studentService } from '../services/api';
import { useToast } from '../components/Toast';
import { useChatContext } from '../components/chat/useChatContext';

export default function CourseLearnPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completedBanner, setCompletedBanner] = useState(null);
  const { setLesson } = useChatContext();

  useEffect(() => {
    setLesson(
      !loading && course && currentLesson
        ? { courseId, lessonId: currentLesson.id, title: currentLesson.title }
        : null,
    );
    return () => setLesson(null);
  }, [courseId, course, currentLesson, loading, setLesson]);

  const loadCourseAndLessons = async () => {
    setLoading(true);
    try {
      const lessonsRes = await studentService.getCourseLessons(courseId);
      const fetchedCourse = lessonsRes.data?.course;
      const fetchedLessons = lessonsRes.data?.lessons || [];

      setCourse(fetchedCourse);
      setLessons(fetchedLessons);

      try {
        const resumeRes = await studentService.startResumeCourse(courseId);
        const resumeLessonId = resumeRes.data?.currentLesson?.lessonId;
        const target = fetchedLessons.find((l) => l.id === resumeLessonId) || fetchedLessons[0];
        setCurrentLesson(target || null);
      } catch {
        setCurrentLesson(fetchedLessons[0] || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load course lessons.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseAndLessons();
  }, [courseId]);

  const handleCompleteCurrent = async () => {
    if (!currentLesson) return;
    setCompleting(true);
    try {
      const res = await studentService.completeLesson(courseId, currentLesson.id);
      addToast('Lesson marked as completed!', 'success');

      setLessons((prev) =>
        prev.map((l) => (l.id === currentLesson.id ? { ...l, status: 'completed' } : l)),
      );

      if (res.data?.isCompleted) {
        setCompletedBanner({
          certificateNumber: res.data.certificateNumber,
        });
      } else {
        const currentIndex = lessons.findIndex((l) => l.id === currentLesson.id);
        if (currentIndex < lessons.length - 1) {
          setCurrentLesson(lessons[currentIndex + 1]);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to complete lesson.', 'error');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  if (!course) {
    return (
      <div className="empty-state">
        <h3>Course not found</h3>
        <p>You may not be enrolled in this course, or the course does not exist.</p>
        <div style={{ marginTop: '16px' }}>
          <Link to="/courses" className="btn btn-primary">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const completedCount = lessons.filter((l) => l.status === 'completed').length;
  const progressPercent =
    lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <button
            onClick={() => navigate('/courses')}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '8px' }}
          >
            &larr; Back to Courses
          </button>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '22px', margin: 0 }}>
            {course.title}
          </h2>
        </div>

        <div style={{ minWidth: '220px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              marginBottom: '4px',
            }}
          >
            <span style={{ color: 'var(--muted)' }}>Course Progress</span>
            <span style={{ fontWeight: 600, color: 'var(--purple)' }}>{progressPercent}%</span>
          </div>
          <div className="progress-wrap" style={{ margin: 0 }}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      {completedBanner && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            border: '1px solid #6ee7b7',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ color: '#065f46', margin: '0 0 4px', fontSize: '18px' }}>
              🎉 Congratulations! You have completed this course!
            </h3>
            <p style={{ color: '#047857', margin: 0, fontSize: '14px' }}>
              Your certificate has been issued! Certificate Number:{' '}
              <strong>{completedBanner.certificateNumber}</strong>
            </p>
          </div>
          <Link to="/certificates" className="btn btn-primary btn-sm">
            View Certificate &rarr;
          </Link>
        </div>
      )}

      {lessons.length === 0 ? (
        <div
          className="empty-state"
          style={{
            background: 'var(--panel)',
            borderRadius: '14px',
            border: '1px solid #eeeef6',
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <div className="empty-icon" style={{ fontSize: '42px', marginBottom: '12px' }}>
            📝
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>
            Khóa học đang hoàn thiện bài giảng
          </h3>
          <p
            style={{
              color: 'var(--muted)',
              maxWidth: '480px',
              margin: '0 auto 20px',
              fontSize: '14px',
            }}
          >
            Giảng viên đang cập nhật giáo trình cho khóa học này. Bạn đã đăng ký thành công và có
            thể quay lại học ngay khi bài giảng được tải lên!
          </p>
          <div>
            <button onClick={() => navigate('/courses')} className="btn btn-primary">
              Xem các khóa học khác &rarr;
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '24px' }}
        >
          <div
            style={{
              background: 'var(--panel)',
              borderRadius: '14px',
              border: '1px solid #eeeef6',
              padding: '16px',
              height: 'fit-content',
            }}
          >
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 600,
                margin: '0 0 12px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              Course Syllabus ({completedCount}/{lessons.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lessons.map((lesson, idx) => {
                const isActive = currentLesson?.id === lesson.id;
                const isDone = lesson.status === 'completed';

                return (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLesson(lesson)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      background: isActive ? 'var(--lav)' : isDone ? '#f0fdf4' : 'transparent',
                      border: isActive ? '1px solid #d4ceff' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: isDone ? '#22c55e' : isActive ? 'var(--purple)' : '#e5e7eb',
                        color: isDone || isActive ? '#fff' : '#4b5563',
                        flex: '0 0 auto',
                      }}
                    >
                      {isDone ? '✓' : idx + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? 'var(--purple)' : 'var(--ink)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {lesson.title}
                      </div>
                      {lesson.duration ? (
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {lesson.duration} mins
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              background: 'var(--panel)',
              borderRadius: '14px',
              border: '1px solid #eeeef6',
              padding: '28px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {currentLesson ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div>
                    <span
                      className={`badge ${currentLesson.status === 'completed' ? 'badge-completed' : 'badge-in_progress'}`}
                    >
                      {currentLesson.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                    <h2
                      style={{ fontFamily: 'Space Grotesk', fontSize: '20px', margin: '8px 0 0' }}
                    >
                      {currentLesson.title}
                    </h2>
                  </div>
                  {currentLesson.duration ? (
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      ⏱ Duration: {currentLesson.duration} minutes
                    </span>
                  ) : null}
                </div>

                <div
                  style={{
                    flex: 1,
                    fontSize: '15px',
                    lineHeight: 1.7,
                    color: '#334155',
                    marginBottom: '32px',
                  }}
                >
                  {currentLesson.content ? (
                    <div style={{ whiteSpace: 'pre-line' }}>{currentLesson.content}</div>
                  ) : (
                    <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                      This lesson does not contain text content yet. Follow along with your
                      instructor materials.
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Lesson {currentLesson.order || 1} of {lessons.length}
                  </span>

                  <button
                    onClick={handleCompleteCurrent}
                    disabled={completing || currentLesson.status === 'completed'}
                    className="btn btn-primary"
                  >
                    {currentLesson.status === 'completed'
                      ? 'Completed ✓'
                      : completing
                        ? 'Updating...'
                        : 'Mark as Completed & Continue'}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>Select a lesson from the syllabus to start learning.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
