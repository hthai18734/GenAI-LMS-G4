import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { studentService } from '../features/student/api.js';
import { materialService, discussionService, enrollmentService, progressService, learningReportService } from '../features/learning/api.js';
import { getUser } from '../features/auth/api.js';
import { useToast } from '../components/Toast';
import { useChatContext } from '../components/chat/useChatContext';
import ReviewsPanel from '../components/ReviewsPanel';

export default function CourseLearnPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const currentUser = getUser();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completedBanner, setCompletedBanner] = useState(null);
  const { setLesson } = useChatContext();

  // Iteration 3 states: enrollment lifecycle, progress & reports
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState('active');
  const [courseProgress, setCourseProgress] = useState(null);
  const [completingCourse, setCompletingCourse] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingEnrollment, setCancellingEnrollment] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalTab, setReportModalTab] = useState('new');
  const [myReports, setMyReports] = useState([]);
  const [reportIssueType, setReportIssueType] = useState('BROKEN_VIDEO');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [videoProgress, setVideoProgress] = useState(null);

  // Tab state: 'content' | 'materials' | 'discussions'
  const [activeTab, setActiveTab] = useState('content');

  // Materials
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Discussions
  const [discussions, setDiscussions] = useState([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [newThreadBody, setNewThreadBody] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [submittingThread, setSubmittingThread] = useState(false);
  const [replyTextMap, setReplyTextMap] = useState({});
  const [threadRepliesMap, setThreadRepliesMap] = useState({}); // { [threadId]: reply[] }
  const [loadingRepliesMap, setLoadingRepliesMap] = useState({}); // { [threadId]: bool }
  const [expandedThreadId, setExpandedThreadId] = useState(null); // which thread's replies are visible

  // Video heartbeat refs & states
  const videoElementRef = React.useRef(null);
  const heartbeatIntervalRef = React.useRef(null);
  const videoSessionIdRef = React.useRef(null);
  const prevPositionRef = React.useRef(0);
  const lastTimeRef = React.useRef(0);
  const seqRef = React.useRef(1);
  const [localWatchedSeconds, setLocalWatchedSeconds] = useState(0);
  const [localWatchedPercent, setLocalWatchedPercent] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  useEffect(() => {
    setLesson(!loading && course && currentLesson ? { courseId, lessonId: currentLesson.id, title: currentLesson.title } : null);
    return () => setLesson(null);
  }, [courseId, course, currentLesson, loading, setLesson]);

  const loadCourseProgress = async () => {
    try {
      const res = await progressService.getCourseProgress(courseId);
      setCourseProgress(res.data?.progress || res.data || null);
    } catch {
      // ignore
    }
  };

  const loadCourseAndLessons = async () => {
    setLoading(true);
    try {
      // 1. Fetch lessons
      const [lessonsRes, quizzesRes, assignmentsRes] = await Promise.all([
        studentService.getCourseLessons(courseId),
        studentService.getCourseQuizzes(courseId).catch(() => ({ data: { quizzes: [] } })),
        studentService.getCourseAssignments(courseId).catch(() => ({ data: { assignments: [] } })),
      ]);
      const fetchedCourse = lessonsRes.data?.course;
      const fetchedLessons = lessonsRes.data?.lessons || [];

      setCourse(fetchedCourse);
      setLessons(fetchedLessons);
      setQuizzes(quizzesRes.data?.quizzes || []);
      setAssignments(assignmentsRes.data?.assignments || []);
      if (lessonsRes.data?.enrollmentId) {
        setEnrollmentId(lessonsRes.data.enrollmentId);
      }
      if (lessonsRes.data?.enrollmentStatus) {
        setEnrollmentStatus(lessonsRes.data.enrollmentStatus);
      }

      // Fetch progress (I3-04)
      loadCourseProgress();

      // 2. Fetch resume position (UC-10.4)
      try {
        const resumeRes = await studentService.startResumeCourse(courseId);
        const resumeLessonId = resumeRes.data?.currentLesson?.lessonId;
        const target = fetchedLessons.find((l) => l.id === resumeLessonId) || fetchedLessons[0];
        setCurrentLesson(target || null);
      } catch {
        // Fallback to first lesson
        setCurrentLesson(fetchedLessons[0] || null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load course lessons.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async (lessonId) => {
    if (!lessonId) return;
    setLoadingMaterials(true);
    try {
      const res = await materialService.getMaterials(lessonId);
      setMaterials(res.data?.materials || res.materials || []);
    } catch {
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const loadDiscussions = async () => {
    setLoadingDiscussions(true);
    try {
      const res = await discussionService.getThreads(courseId);
      setDiscussions(res.data?.threads || res.threads || []);
    } catch {
      setDiscussions([]);
    } finally {
      setLoadingDiscussions(false);
    }
  };

  const loadMyReports = async () => {
    try {
      const res = await learningReportService.getMyReports();
      setMyReports(res.data?.reports || res.reports || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCourseAndLessons();
    loadMyReports();
  }, [courseId]);

  useEffect(() => {
    if (currentLesson?.id) {
      loadMaterials(currentLesson.id);
    }
  }, [currentLesson?.id]);

  useEffect(() => {
    if (activeTab === 'discussions') {
      loadDiscussions();
    }
  }, [activeTab, courseId]);

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThreadBody.trim()) return;
    setSubmittingThread(true);
    try {
      await discussionService.createThread(courseId, { title: newThreadTitle, body: newThreadBody });
      addToast('Discussion question posted successfully!', 'success');
      setNewThreadTitle('');
      setNewThreadBody('');
      await loadDiscussions();
    } catch (err) {
      addToast(err.message || 'Failed to post discussion.', 'error');
    } finally {
      setSubmittingThread(false);
    }
  };

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

  const handleReplyThread = async (postId) => {
    const text = (replyTextMap[postId] || '').trim();
    if (!text) return;
    try {
      await discussionService.replyThread(postId, { body: text });
      addToast('Reply posted successfully!', 'success');
      setReplyTextMap((prev) => ({ ...prev, [postId]: '' }));
      // Refresh replies list for this thread
      await loadThreadReplies(postId);
      setExpandedThreadId(postId);
      // Also bump replyCount in thread list
      setDiscussions((prev) =>
        prev.map((t) => t.id === postId ? { ...t, replyCount: (t.replyCount || 0) + 1 } : t)
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
        // Deleted a reply – refresh replies for parent thread
        await loadThreadReplies(parentId);
        setDiscussions((prev) =>
          prev.map((t) => t.id === parentId ? { ...t, replyCount: Math.max(0, (t.replyCount || 0) - 1) } : t)
        );
      } else {
        // Deleted a top-level thread – soft-delete display
        await loadDiscussions();
        setExpandedThreadId(null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete post.', 'error');
    }
  };

  // Video Heartbeat Lifecycle (I3-05)
  useEffect(() => {
    videoSessionIdRef.current = 'sess_' + Math.random().toString(36).substring(2, 9);
    prevPositionRef.current = 0;
    lastTimeRef.current = 0;
    seqRef.current = 1;
    setVideoProgress(null);
    setLocalWatchedSeconds(0);
    setLocalWatchedPercent(0);
    setVideoDuration(0);

    if (currentLesson?.id) {
      progressService.getVideoProgress(currentLesson.id)
        .then((res) => {
          const prog = res.data?.progress || res.data;
          if (prog) {
            setVideoProgress(prog);
            if (prog.watchedSeconds !== undefined) setLocalWatchedSeconds(Math.round(prog.watchedSeconds));
            if (prog.watchedPercent !== undefined) setLocalWatchedPercent(Math.round(prog.watchedPercent));
            if (prog.resumePositionSec && videoElementRef.current) {
              videoElementRef.current.currentTime = prog.resumePositionSec;
              lastTimeRef.current = prog.resumePositionSec;
              prevPositionRef.current = prog.resumePositionSec;
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [currentLesson?.id]);

  const sendVideoHeartbeatCall = async () => {
    const v = videoElementRef.current;
    if (!v || !currentLesson?.id) return;
    try {
      const currentPos = v.currentTime || 0;
      const prevPos = prevPositionRef.current || 0;
      prevPositionRef.current = currentPos;
      seqRef.current += 1;
      const dur = v.duration || videoDuration || 0;

      const res = await progressService.sendVideoHeartbeat(currentLesson.id, {
        lessonId: currentLesson.id,
        currentTime: currentPos,
        positionSec: currentPos,
        previousPositionSec: prevPos,
        duration: dur,
        durationSec: dur,
        playbackRate: v.playbackRate || 1.0,
        sessionId: videoSessionIdRef.current,
        seq: seqRef.current,
        eventType: 'HEARTBEAT',
      });
      const data = res.data?.progress || res.data;
      if (data) {
        setVideoProgress(data);
        if (data.watchedPercent !== undefined) {
          setLocalWatchedPercent(Math.round(data.watchedPercent));
        }
        if (data.watchedSeconds !== undefined) {
          setLocalWatchedSeconds(Math.round(data.watchedSeconds));
        }
        if (data.completed && currentLesson.status !== 'completed') {
          setLessons((prev) =>
            prev.map((l) => (l.id === currentLesson.id ? { ...l, status: 'completed' } : l))
          );
          addToast('🎉 You have watched 90% of the lesson video!', 'success');
          loadCourseProgress();
        }
      }
    } catch {
      // silent
    }
  };

  const handleVideoTimeUpdate = (e) => {
    const v = e.target;
    if (!v) return;
    const current = v.currentTime || 0;
    const dur = v.duration || videoDuration || 0;
    if (dur > 0 && dur !== videoDuration) {
      setVideoDuration(dur);
    }

    const lastTime = lastTimeRef.current;
    lastTimeRef.current = current;

    // IMPORTANT: Only accumulate watch time if video is playing continuously (delta <= 1.5s).
    // If the user drags or skips the video slider forward (delta > 1.5s), DO NOT COUNT THE SKIPPED GAP!
    const delta = current - lastTime;
    if (delta > 0 && delta <= 1.5 && !v.paused && !v.seeking) {
      setLocalWatchedSeconds((prevSec) => {
        const nextSec = prevSec + delta;
        if (dur > 0) {
          const nextPct = Math.min(100, Math.round((nextSec / dur) * 100));
          setLocalWatchedPercent(nextPct);
          setVideoProgress((prev) => ({
            ...prev,
            watchedSeconds: Math.round(nextSec),
            watchedPercent: nextPct,
            completed: Boolean(prev?.completed || nextPct >= 90),
          }));
        }
        return nextSec;
      });
    }
  };

  const startVideoHeartbeat = () => {
    sendVideoHeartbeatCall();
    if (heartbeatIntervalRef.current) return;
    heartbeatIntervalRef.current = setInterval(() => {
      const v = videoElementRef.current;
      if (!v || v.paused) return;
      sendVideoHeartbeatCall();
    }, 3000);
  };

  const stopVideoHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    sendVideoHeartbeatCall();
  };

  // I3-01: Cancel Enrollment
  const handleCancelEnrollment = async () => {
    if (!enrollmentId) return;
    setCancellingEnrollment(true);
    try {
      await enrollmentService.cancelEnrollment(enrollmentId);
      addToast('Enrollment cancelled successfully.', 'success');
      navigate('/courses');
    } catch (err) {
      addToast(err.message || 'Failed to cancel enrollment.', 'error');
    } finally {
      setCancellingEnrollment(false);
      setShowCancelModal(false);
    }
  };

  // I3-02: Complete Course & Issue Certificate
  const handleCompleteCourse = async () => {
    if (!enrollmentId) return;
    setCompletingCourse(true);
    try {
      const res = await enrollmentService.completeCourse(enrollmentId);
      addToast('Congratulations on completing the course and earning your certificate!', 'success');
      setCompletedBanner({
        certificateNumber: res.data?.certificate?.certificateNumber || res.data?.certificateNumber || 'CERT-COMPLETED',
      });
      setEnrollmentStatus('completed');
      await loadCourseProgress();
      setTimeout(() => {
        navigate('/certificates');
      }, 1500);
    } catch (err) {
      addToast(err.message || 'Failed to complete course.', 'error');
    } finally {
      setCompletingCourse(false);
    }
  };

  // I3-07: Report Content Issue
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;
    setSubmittingReport(true);
    try {
      await learningReportService.reportIssue({
        courseId,
        lessonId: currentLesson?.id,
        issueType: reportIssueType,
        description: reportDescription.trim(),
      });
      addToast('Issue report sent to the instructor.', 'success');
      await loadMyReports();
      setReportModalTab('history');
      setReportDescription('');
      setReportIssueType('BROKEN_VIDEO');
    } catch (err) {
      addToast(err.message || 'Failed to submit issue report.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleCompleteCurrent = async () => {
    if (!currentLesson) return;
    setCompleting(true);
    try {
      const res = await studentService.completeLesson(courseId, currentLesson.id);
      addToast('Lesson marked as completed!', 'success');

      // Update local state
      setLessons((prev) =>
        prev.map((l) => (l.id === currentLesson.id ? { ...l, status: 'completed' } : l))
      );

      if (res.data?.isCompleted) {
        setCompletedBanner({
          certificateNumber: res.data.certificateNumber,
        });
      } else {
        // Advance to next uncompleted lesson if available
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
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const effectivePercent = courseProgress?.percentage !== undefined ? Math.round(courseProgress.percentage) : progressPercent;

  return (
    <div>
      {/* Top Bar with back link, action buttons and progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button
            onClick={() => navigate('/courses')}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '8px' }}
          >
            &larr; Back to Courses
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '22px', margin: 0 }}>{course.title}</h2>
            {enrollmentStatus === 'completed' && (
              <span className="badge badge-completed" style={{ fontSize: '12px' }}>Graduated ✓</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {courseProgress?.eligibleToComplete && enrollmentStatus !== 'completed' && (
            <button
              onClick={handleCompleteCourse}
              disabled={completingCourse}
              className="btn btn-sm"
              style={{ background: '#10b981', color: '#fff', fontWeight: 600 }}
            >
              {completingCourse ? 'Issuing Certificate...' : '🎓 Complete Course'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              loadMyReports();
              setShowReportModal(true);
            }}
            className="btn btn-secondary btn-sm"
            title="Report an issue or view instructor feedback"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>⚠️</span> Report & Feedback
            {myReports.filter((r) => String(r.course?.id || r.courseId) === String(courseId)).length > 0 && (
              <span
                style={{
                  background: '#4f46e5',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {myReports.filter((r) => String(r.course?.id || r.courseId) === String(courseId)).length}
              </span>
            )}
          </button>

          {enrollmentStatus === 'active' && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
              title="Cancel course enrollment"
            >
              Cancel Enrollment
            </button>
          )}

          <div style={{ minWidth: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--muted)' }}>Progress ({courseProgress?.completedRequired || completedCount}/{courseProgress?.totalRequired || lessons.length})</span>
              <span style={{ fontWeight: 600, color: 'var(--purple)' }}>{effectivePercent}%</span>
            </div>
            <div className="progress-wrap" style={{ margin: 0 }}>
              <div className="progress-fill" style={{ width: `${effectivePercent}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {completedBanner && (
        <div style={{
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
        }}>
          <div>
            <h3 style={{ color: '#065f46', margin: '0 0 4px', fontSize: '18px' }}>
              🎉 Congratulations! You have completed this course!
            </h3>
            <p style={{ color: '#047857', margin: 0, fontSize: '14px' }}>
              Your certificate has been issued! Certificate Number: <strong>{completedBanner.certificateNumber}</strong>
            </p>
          </div>
          <Link to="/certificates" className="btn btn-primary btn-sm">
            View Certificate &rarr;
          </Link>
        </div>
      )}

      {/* Learning Grid: Lessons list + Lesson viewer */}
      {(quizzes.length > 0 || assignments.length > 0) && (
        <section style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6', padding: '18px', marginBottom: '24px' }}>
          <h3 style={{ marginTop: 0 }}>Course activities</h3>
          {quizzes.map((quiz) => (
            <div
              key={quiz._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: '1px solid var(--line)',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong>{quiz.title}</strong>
                </div>
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                  {quiz.timeLimit} phút · Tối đa {quiz.attemptLimit} lượt làm
                  {quiz.latestAttempt && (
                    <span style={{ marginLeft: '6px', fontWeight: '500' }}>
                      · Điểm gần nhất: <span style={{ color: quiz.latestAttempt.passed ? '#16a34a' : '#dc2626' }}>{quiz.latestAttempt.score}%</span>
                    </span>
                  )}
                </small>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {quiz.latestAttempt && (
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => navigate(`/quiz-attempts/${quiz.latestAttempt.id}/result`)}
                  >
                    Xem lại bài làm
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={() => navigate(`/quizzes/${quiz._id}/start`)}
                >
                  Làm bài kiểm tra
                </button>
              </div>
            </div>
          ))}
          {assignments.map((assignment) => (
            <div key={assignment._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <strong>{assignment.title}</strong>
              <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{assignment.content}</p>
            </div>
          ))}
        </section>
      )}
      {lessons.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6', padding: '40px 24px', textAlign: 'center' }}>
          <div className="empty-icon" style={{ fontSize: '42px', marginBottom: '12px' }}>📝</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Lessons are being prepared</h3>
          <p style={{ color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 20px', fontSize: '14px' }}>
            Your enrollment is confirmed. The teacher is preparing the course content. Check back when lessons are available!
          </p>
          <div>
            <button onClick={() => navigate('/courses')} className="btn btn-primary">
              Browse other courses &rarr;
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '24px' }}>
          {/* Lesson List */}
          <div style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6', padding: '16px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
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
                  <span style={{
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
                  }}>
                    {isDone ? '✓' : idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--purple)' : 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {lesson.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                      <span>{lesson.videoRef ? '🎬 Video' : '📖 Reading'}</span>
                      {lesson.duration ? <span>• {lesson.duration} mins</span> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Lesson View */}
        <div style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6', padding: '28px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          {currentLesson ? (
            <>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span className={`badge ${currentLesson.status === 'completed' ? 'badge-completed' : 'badge-in_progress'}`}>
                    {currentLesson.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                  <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '20px', margin: '8px 0 0' }}>
                    {currentLesson.title}
                  </h2>
                </div>
                {currentLesson.duration ? (
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    ⏱ Duration: {currentLesson.duration} minutes
                  </span>
                ) : null}
              </div>

              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('content')}
                  className={`btn btn-sm ${activeTab === 'content' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  📖 Lesson Content
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('materials')}
                  className={`btn btn-sm ${activeTab === 'materials' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  📁 Materials & Downloads ({materials.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('discussions')}
                  className={`btn btn-sm ${activeTab === 'discussions' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  💬 Discussions ({discussions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`btn btn-sm ${activeTab === 'reviews' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  ⭐ Ratings & Reviews
                </button>
              </div>

              {/* Tab 1: Content */}
              {activeTab === 'content' && (
                <div style={{ flex: 1, fontSize: '15px', lineHeight: 1.7, color: '#334155', marginBottom: '32px' }}>
                  {/* Instructor Feedback Banner for Current Lesson */}
                  {(() => {
                    const currentFeedback = myReports.find(
                      (r) =>
                        String(r.lesson?.id || r.lessonId) === String(currentLesson?.id) &&
                        r.resolutionNote
                    );
                    if (!currentFeedback) return null;
                    return (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '12px',
                          padding: '14px 18px',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          boxShadow: '0 2px 8px rgba(34,197,94,0.08)',
                        }}
                      >
                        <span style={{ fontSize: '22px' }}>💬</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                              Instructor Response to your report ({currentFeedback.issueType}):
                            </span>
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#16a34a',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                              }}
                            >
                              {currentFeedback.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '15px', color: '#15803d', marginTop: '6px', fontWeight: 600 }}>
                            "{currentFeedback.resolutionNote}"
                          </div>
                          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
                            Original report: "{currentFeedback.description}" • Responded{' '}
                            {currentFeedback.resolvedAt ? new Date(currentFeedback.resolvedAt).toLocaleString() : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const activeVideo = currentLesson.videoRef;
                    if (!activeVideo) return null;

                    const isYouTube = activeVideo.includes('youtube.com') || activeVideo.includes('youtu.be');
                    let embedUrl = activeVideo;
                    if (isYouTube) {
                      const youtuBeMatch = activeVideo.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
                      if (youtuBeMatch) {
                        embedUrl = `https://www.youtube.com/embed/${youtuBeMatch[1]}`;
                      } else {
                        const youtubeWatchMatch = activeVideo.match(/[?&]v=([a-zA-Z0-9_-]+)/);
                        if (youtubeWatchMatch) {
                          embedUrl = `https://www.youtube.com/embed/${youtubeWatchMatch[1]}`;
                        }
                      }
                    }

                    return (
                      <div style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', background: '#000', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        {isYouTube ? (
                          <div>
                            <iframe
                              key={embedUrl}
                              title="Video lecture"
                              src={embedUrl}
                              style={{ width: '100%', height: '420px', border: 'none', display: 'block' }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                            <div style={{ background: '#0f172a', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#94a3b8' }}>
                              <span>🎬 <strong>YouTube Lecture:</strong> Streaming video</span>
                              <span style={{ color: '#4ade80', fontWeight: 600 }}>✓ Ready to learn</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <video
                              key={activeVideo}
                              src={activeVideo}
                              ref={videoElementRef}
                              controls
                              style={{ width: '100%', maxHeight: '420px', display: 'block', background: '#000' }}
                              onPlay={startVideoHeartbeat}
                              onPause={stopVideoHeartbeat}
                              onEnded={() => {
                                stopVideoHeartbeat();
                                sendVideoHeartbeatCall();
                              }}
                              onTimeUpdate={handleVideoTimeUpdate}
                              onSeeking={(e) => {
                                lastTimeRef.current = e.target.currentTime || 0;
                                prevPositionRef.current = e.target.currentTime || 0;
                              }}
                              onSeeked={(e) => {
                                lastTimeRef.current = e.target.currentTime || 0;
                                prevPositionRef.current = e.target.currentTime || 0;
                                sendVideoHeartbeatCall();
                              }}
                            >
                              <source src={activeVideo} />
                              Your browser does not support the video tag.
                            </video>
                            {(() => {
                              const effPercent = Math.round(videoProgress?.watchedPercent !== undefined ? videoProgress.watchedPercent : localWatchedPercent);
                              const effSec = Math.round(videoProgress?.watchedSeconds !== undefined ? videoProgress.watchedSeconds : localWatchedSeconds);
                              const isSatisfied = Boolean(videoProgress?.completed || effPercent >= 90 || currentLesson.status === 'completed');
                              return (
                                <div style={{ background: '#0f172a', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#94a3b8', flexWrap: 'wrap', gap: '8px' }}>
                                  <span>
                                    ⏱ <strong>Watched Time:</strong> {effSec}s {videoDuration > 0 ? `/ ${Math.round(videoDuration)}s` : ''} ({effPercent}%)
                                  </span>
                                  <span style={{ color: isSatisfied ? '#4ade80' : '#f59e0b', fontWeight: 600 }}>
                                    {isSatisfied ? '✓ Minimum 90% watched criteria met' : `Watch at least 90% to complete video (Current: ${effPercent}%)`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {currentLesson.content ? (
                    <div style={{ whiteSpace: 'pre-line' }}>{currentLesson.content}</div>
                  ) : (
                    <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                      This lesson does not contain text content. You can follow along with the video or attachments.
                    </p>
                  )}

                  {materials.length > 0 && (
                    <div
                      style={{
                        marginTop: '24px',
                        padding: '14px 18px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '22px' }}>📥</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#166534' }}>
                            Course Materials & Downloads Available ({materials.length})
                          </div>
                          <div style={{ fontSize: '12px', color: '#15803d' }}>
                            Lecture slides, PDF notes, and exercise files for this lesson.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveTab('materials')}
                        style={{ fontSize: '13px', padding: '6px 14px' }}
                      >
                        View & Download Files ({materials.length}) →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Materials */}
              {activeTab === 'materials' && (
                <div style={{ flex: 1, marginBottom: '32px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
                      📁 Course Materials & Downloads
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                      View or download lesson resources, lecture slides, code samples, and exercise files.
                    </p>
                  </div>
                  {loadingMaterials ? (
                    <p style={{ color: 'var(--muted)' }}>Loading materials...</p>
                  ) : materials.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: 'var(--muted)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>No materials attached to this lesson</div>
                      <div style={{ fontSize: '13px', marginTop: '4px' }}>
                        Your instructor has not uploaded any downloadable files for this specific lesson yet.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {materials.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            background: '#fff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            flexWrap: 'wrap',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: '#e0e7ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                              }}
                            >
                              📄
                            </div>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{m.name}</div>
                              {m.description && <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{m.description}</div>}
                              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                                {m.sizeBytes ? `${(m.sizeBytes / 1024).toFixed(1)} KB` : ''} • {m.mimeType || 'Document'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <a
                              href={materialService.getDownloadUrl(m.id, { view: true })}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '13px', padding: '6px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span>👁️</span> View Material
                            </a>
                            <a
                              href={materialService.getDownloadUrl(m.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '13px', padding: '6px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              download
                            >
                              <span>⬇️</span> Download Material
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Discussions */}
              {activeTab === 'discussions' && (
                <div style={{ flex: 1, marginBottom: '32px' }}>
                  {/* Create thread form */}
                  <form onSubmit={handleCreateThread} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px' }}>Ask a Question / Class Discussion</h4>
                    <input
                      type="text"
                      placeholder="Question title (optional)"
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', marginBottom: '8px' }}
                    />
                    <textarea
                      placeholder="Write your question or discussion topic here..."
                      required
                      rows="3"
                      value={newThreadBody}
                      onChange={(e) => setNewThreadBody(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', marginBottom: '10px' }}
                    />
                    <button type="submit" disabled={submittingThread || !newThreadBody.trim()} className="btn btn-primary btn-sm">
                      {submittingThread ? 'Posting...' : 'Post Question'}
                    </button>
                  </form>

                  {/* Thread list */}
                  {loadingDiscussions ? (
                    <p style={{ color: 'var(--muted)' }}>Loading discussions...</p>
                  ) : discussions.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: 'var(--muted)' }}>
                      No discussions yet. Be the first to start a conversation!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {discussions.map((t) => {
                        const isAuthor = currentUser && String(t.author?.id) === String(currentUser._id || currentUser.id);
                        const isExpanded = expandedThreadId === t.id;
                        const replies = threadRepliesMap[t.id] || [];
                        const loadingReplies = loadingRepliesMap[t.id];
                        return (
                          <div key={t.id} style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
                            {/* Thread Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>👤 {t.author?.fullName || 'User'}</span>
                                <span className="badge" style={{ fontSize: '10px' }}>{t.author?.role || 'student'}</span>
                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</span>
                              </div>
                              {isAuthor && t.status !== 'deleted' && (
                                <button type="button" onClick={() => handleDeletePost(t.id)} className="ghost compact" style={{ color: '#ef4444', fontSize: '11px' }}>
                                  Delete
                                </button>
                              )}
                            </div>

                            {t.title && <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>{t.title}</div>}
                            <div style={{ fontSize: '14px', color: t.status === 'deleted' ? 'var(--muted)' : '#334155', fontStyle: t.status === 'deleted' ? 'italic' : 'normal', marginBottom: '12px' }}>
                              {t.status === 'deleted' ? '[This post has been removed]' : t.body}
                            </div>

                            {/* Toggle Replies Button */}
                            {t.status !== 'deleted' && (
                              <button
                                type="button"
                                onClick={() => handleToggleReplies(t.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple)', fontSize: '12px', fontWeight: 600, padding: '0', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {isExpanded ? '🔼 Hide Replies' : '🔽 View Replies'}
                                {(t.replyCount || 0) > 0 && (
                                  <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: '9999px', padding: '1px 7px', fontSize: '11px' }}>
                                    {t.replyCount}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* Replies Section */}
                            {isExpanded && (
                              <div style={{ borderLeft: '3px solid #e0e7ff', paddingLeft: '14px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {loadingReplies ? (
                                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Loading replies...</p>
                                ) : replies.length === 0 ? (
                                  <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>No replies yet. Be the first to respond!</p>
                                ) : (
                                  replies.map((r) => {
                                    const isReplyAuthor = currentUser && String(r.author?.id) === String(currentUser._id || currentUser.id);
                                    return (
                                      <div key={r.id} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '13px' }}>👤 {r.author?.fullName || 'User'}</span>
                                            <span className="badge" style={{ fontSize: '9px' }}>{r.author?.role || 'student'}</span>
                                            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                                          </div>
                                          {isReplyAuthor && r.status !== 'deleted' && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeletePost(r.id, t.id)}
                                              className="ghost compact"
                                              style={{ color: '#ef4444', fontSize: '10px' }}
                                            >
                                              Delete
                                            </button>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '13px', color: r.status === 'deleted' ? 'var(--muted)' : '#334155', fontStyle: r.status === 'deleted' ? 'italic' : 'normal' }}>
                                          {r.status === 'deleted' ? '[Reply removed]' : r.body}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}

                            {/* Reply Input */}
                            {t.status !== 'deleted' && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                <input
                                  type="text"
                                  placeholder="Write a reply..."
                                  value={replyTextMap[t.id] || ''}
                                  onChange={(e) => setReplyTextMap({ ...replyTextMap, [t.id]: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReplyThread(t.id); } }}
                                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '13px' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleReplyThread(t.id)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Reply
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Course Reviews & Ratings */}
              {activeTab === 'reviews' && (
                <div style={{ flex: 1, marginBottom: '32px' }}>
                  <ReviewsPanel courseId={courseId} />
                </div>
              )}

              {/* Navigation Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--line)', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(() => {
                    const idx = lessons.findIndex((l) => l.id === currentLesson.id);
                    const prev = idx > 0 ? lessons[idx - 1] : null;
                    const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
                    return (
                      <>
                        <button
                          type="button"
                          disabled={!prev}
                          onClick={() => setCurrentLesson(prev)}
                          className="btn btn-secondary btn-sm"
                        >
                          &larr; Previous Lesson
                        </button>
                        <button
                          type="button"
                          disabled={!next}
                          onClick={() => setCurrentLesson(next)}
                          className="btn btn-secondary btn-sm"
                        >
                          Next Lesson &rarr;
                        </button>
                      </>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Lesson {currentLesson.order || 1} of {lessons.length}
                  </span>
                  {(() => {
                    const effPercent = Math.round(videoProgress?.watchedPercent !== undefined ? videoProgress.watchedPercent : localWatchedPercent);
                    const isVideoSatisfied = Boolean(videoProgress?.completed || effPercent >= 90 || currentLesson.status === 'completed');
                    const hasVideo = Boolean(currentLesson.videoRef);
                    const isVideoBlock = hasVideo && !isVideoSatisfied;

                    return (
                      <button
                        onClick={handleCompleteCurrent}
                        disabled={completing || currentLesson.status === 'completed' || isVideoBlock}
                        className="btn btn-primary btn-sm"
                        style={{
                          opacity: isVideoBlock ? 0.6 : 1,
                          cursor: isVideoBlock ? 'not-allowed' : 'pointer',
                        }}
                        title={isVideoBlock ? `You must watch at least 90% of the video before completing this lesson (Current: ${effPercent}%)` : ''}
                      >
                        {currentLesson.status === 'completed'
                          ? 'Completed ✓'
                          : completing
                          ? 'Updating...'
                          : isVideoBlock
                          ? `Watch video ≥ 90% (${effPercent}%)`
                          : 'Mark as Completed ✓'}
                      </button>
                    );
                  })()}
                </div>
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

      {/* Modal: Confirm Cancel Enrollment (I3-01) */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#dc2626', margin: '0 0 10px' }}>
              Confirm Cancel Enrollment
            </h3>
            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.5, margin: '0 0 20px' }}>
              Are you sure you want to cancel your enrollment in <strong>"{course?.title}"</strong>? Your learning progress for this course will be paused.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn btn-secondary btn-sm"
                disabled={cancellingEnrollment}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCancelEnrollment}
                className="btn btn-sm"
                style={{ background: '#dc2626', color: '#fff' }}
                disabled={cancellingEnrollment}
              >
                {cancellingEnrollment ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Report Content Issue & View Instructor Responses */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '560px', width: '92%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                ⚠️ Content Issues & Instructor Feedback
              </h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setReportModalTab('new')}
                className={`btn btn-sm ${reportModalTab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                ✍️ Report New Issue
              </button>
              <button
                type="button"
                onClick={() => {
                  loadMyReports();
                  setReportModalTab('history');
                }}
                className={`btn btn-sm ${reportModalTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                💬 Feedback & Responses ({myReports.filter((r) => String(r.course?.id || r.courseId) === String(courseId)).length})
              </button>
            </div>

            {reportModalTab === 'new' ? (
              <form onSubmit={handleSubmitReport}>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 14px' }}>
                  Lesson: <strong>{currentLesson?.title || 'Current'}</strong>
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Issue Type
                  </label>
                  <select
                    value={reportIssueType}
                    onChange={(e) => setReportIssueType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '14px' }}
                  >
                    <option value="BROKEN_VIDEO">Broken Video / Playback Error</option>
                    <option value="AUDIO_ISSUE">Audio Issue</option>
                    <option value="BROKEN_FILE">Broken File / Download Issue</option>
                    <option value="INCORRECT_CONTENT">Incorrect Content / Typo</option>
                    <option value="WRONG_ANSWER">Incorrect Quiz Answer</option>
                    <option value="OUTDATED_CONTENT">Outdated Content</option>
                    <option value="OTHER">Other Issue</option>
                  </select>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Detailed Description
                  </label>
                  <textarea
                    rows="4"
                    required
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Describe the issue you encountered in detail so the instructor can assist..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="btn btn-secondary btn-sm"
                    disabled={submittingReport}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submittingReport || !reportDescription.trim()}
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {(() => {
                  const courseReports = myReports.filter((r) => String(r.course?.id || r.courseId) === String(courseId));
                  if (courseReports.length === 0) {
                    return (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: '10px' }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>No reports submitted for this course yet</div>
                        <div style={{ fontSize: '13px', marginTop: '4px' }}>
                          If you find a problem in any lesson, click "Report New Issue" above.
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {courseReports.map((r) => {
                        const statusColors = {
                          OPEN: { label: 'Pending', color: '#ea580c', bg: '#ffedd5' },
                          IN_REVIEW: { label: 'In Review', color: '#2563eb', bg: '#dbeafe' },
                          RESOLVED: { label: 'Resolved', color: '#16a34a', bg: '#dcfce7' },
                          REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
                        };
                        const badge = statusColors[r.status] || { label: r.status, color: '#64748b', bg: '#f1f5f9' };

                        return (
                          <div
                            key={r.id}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '14px 16px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    background: badge.bg,
                                    color: badge.color,
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                  }}
                                >
                                  {badge.label}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4f46e5' }}>
                                  {r.issueType}
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                {new Date(r.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                              Lesson: <strong>{r.lesson?.title || 'Lesson'}</strong>
                            </div>

                            <div style={{ fontSize: '13px', color: '#1e293b', background: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                              "{r.description}"
                            </div>

                            {/* Instructor Response */}
                            {r.resolutionNote ? (
                              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', marginTop: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>💬</span> Instructor Response:
                                </div>
                                <div style={{ fontSize: '14px', color: '#15803d', marginTop: '3px', fontWeight: 600 }}>
                                  "{r.resolutionNote}"
                                </div>
                                {r.resolvedAt && (
                                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
                                    Responded on {new Date(r.resolvedAt).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', fontStyle: 'italic' }}>
                                ⏳ Waiting for instructor review...
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                  <Link
                    to="/my-reports"
                    onClick={() => setShowReportModal(false)}
                    style={{ fontSize: '13px', color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}
                  >
                    View all reports &rarr;
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
