import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentService } from '../features/student/api.js';
import { learningStatsService } from '../features/learning/api.js';
import { useAuth } from '../features/auth/useAuth.js';
import { useToast } from '../components/toastContext';

/* ─── Animated Counter Hook ───────────────────────────────────── */
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    let timeoutId;
    const run = () => {
      const start = performance.now();
      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    };
    timeoutId = setTimeout(run, delay);
    return () => {
      clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);
  return value;
}

/* ─── Animated Progress Bar ───────────────────────────────────── */
function AnimatedProgress({ percent, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percent), delay + 300);
    return () => clearTimeout(t);
  }, [percent, delay]);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '999px',
      height: '8px',
      overflow: 'hidden',
      margin: '10px 0',
    }}>
      <div style={{
        width: `${width}%`,
        height: '100%',
        borderRadius: '999px',
        background: color || 'linear-gradient(90deg, #818cf8, #6366f1)',
        transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: `0 0 12px ${color ? color.split(',')[0].replace('linear-gradient(90deg,', '').trim() : '#818cf8'}60`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
          animation: 'shimmer 2s infinite',
        }} />
      </div>
    </div>
  );
}

/* ─── Floating Orb Component ──────────────────────────────────── */
function FloatingOrb({ style }) {
  return (
    <div style={{
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(60px)',
      opacity: 0.15,
      animation: 'floatOrb 6s ease-in-out infinite',
      pointerEvents: 'none',
      ...style,
    }} />
  );
}

/* ─── Stat Card Component ─────────────────────────────────────── */
function StatCard({ icon, label, value, gradient, delay = 0, suffix = '' }) {
  const animVal = useCountUp(typeof value === 'number' ? value : 0, 1400, delay);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      background: '#fff',
      borderRadius: '20px',
      padding: '22px',
      border: '1px solid #eeeef6',
      boxShadow: '0 4px 24px rgba(40,32,104,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      cursor: 'default',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
      position: 'relative',
      overflow: 'hidden',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 20px 50px rgba(40,32,104,0.14)';
        e.currentTarget.style.borderColor = '#dcd8fc';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(40,32,104,0.06)';
        e.currentTarget.style.borderColor = '#eeeef6';
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: '80px', height: '80px',
        background: gradient,
        borderRadius: '0 20px 0 100%',
        opacity: 0.06,
      }} />
      <div style={{
        width: '52px', height: '52px',
        borderRadius: '16px',
        background: gradient,
        display: 'grid',
        placeItems: 'center',
        fontSize: '24px',
        flexShrink: 0,
        boxShadow: `0 8px 20px rgba(0,0,0,0.1)`,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontFamily: 'Space Grotesk',
          fontSize: '30px',
          fontWeight: 800,
          color: '#15182d',
          lineHeight: 1.1,
          letterSpacing: '-0.5px',
        }}>
          {animVal}{suffix}
        </div>
        <div style={{ fontSize: '13px', color: '#68708a', fontWeight: 500, marginTop: '3px' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ─── Course Card Component ───────────────────────────────────── */
function CourseCard({ course, index, onAction }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80 + 200);
    return () => clearTimeout(t);
  }, [index]);

  const progress = course.progressPercent || 0;
  const isCompleted = progress === 100 || course.enrollmentStatus === 'completed';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid #eeeef6',
        boxShadow: hovered ? '0 24px 60px rgba(40,32,104,0.16)' : '0 4px 20px rgba(40,32,104,0.06)',
        transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: visible
          ? hovered ? 'translateY(-10px) scale(1.02)' : 'translateY(0) scale(1)'
          : 'translateY(30px) scale(0.95)',
        opacity: visible ? 1 : 0,
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div style={{
        width: '100%', height: '168px',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
      }}>
        {course.thumbnail
          ? <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} />
          : <span style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}>
              {isCompleted ? '🏆' : course.category === 'AI' ? '🤖' : '💻'}
            </span>
        }
        {/* Overlay gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(15,12,60,0.4) 0%, transparent 60%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }} />
        {/* Progress ring overlay */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '44px', height: '44px',
        }}>
          <svg width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="22" cy="22" r="18" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <circle
              cx="22" cy="22" r="18"
              fill="none"
              stroke={isCompleted ? '#10b981' : '#818cf8'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '10px', fontWeight: 800,
          }}>
            {progress}%
          </div>
        </div>
        {/* Status badge */}
        <div style={{
          position: 'absolute', top: '12px', left: '12px',
          padding: '4px 10px',
          borderRadius: '999px',
          background: isCompleted ? 'rgba(16,185,129,0.9)' : 'rgba(99,102,241,0.9)',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          backdropFilter: 'blur(8px)',
          letterSpacing: '0.04em',
        }}>
          {isCompleted ? '✓ Done' : '▶ Active'}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '18px' }}>
        <div style={{
          fontSize: '12px', color: '#68708a', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: '6px',
        }}>
          {course.category || 'Technology'}
        </div>
        <h3 style={{
          fontFamily: 'Space Grotesk',
          fontSize: '16px', fontWeight: 700,
          color: '#15182d',
          margin: '0 0 10px',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '42px',
        }}>{course.title}</h3>

        {/* Progress bar */}
        <div style={{ margin: '10px 0' }}>
          <div style={{
            background: '#f1f0ff', borderRadius: '999px', height: '6px', overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: '999px',
              background: isCompleted
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #4338ca, #818cf8)',
              transition: 'width 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: '6px',
            fontSize: '12px', color: '#68708a', fontWeight: 500,
          }}>
            <span>{course.completedLessons || 0}/{course.totalLessons || 0} lessons</span>
            <span style={{ color: isCompleted ? '#10b981' : '#4338ca', fontWeight: 700 }}>
              {isCompleted ? '✅ Done' : `${progress}%`}
            </span>
          </div>
        </div>

        {/* Action button */}
        {onAction && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(course); }}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '12px',
              background: isCompleted
                ? 'linear-gradient(100deg, #10b981, #34d399)'
                : 'linear-gradient(100deg, #4338ca, #6366f1)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '4px',
              boxShadow: isCompleted
                ? '0 4px 14px rgba(16,185,129,0.3)'
                : '0 4px 14px rgba(67,56,202,0.3)',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {isCompleted ? '📜 View Certificate' : '▶ Continue Learning'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Recommended Course Card ─────────────────────────────────── */
function RecoCard({ course, index, onEnroll, enrollingId }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const id = course.id || course._id || course.courseId;
  const isEnrolling = enrollingId === id;
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 100 + 200);
    return () => clearTimeout(t);
  }, [index]);
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid #eeeef6',
        boxShadow: hovered ? '0 20px 50px rgba(40,32,104,0.14)' : '0 4px 20px rgba(40,32,104,0.06)',
        transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: visible
          ? hovered ? 'translateY(-8px)' : 'translateY(0)'
          : 'translateY(30px)',
        opacity: visible ? 1 : 0,
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        height: '150px',
        background: `linear-gradient(135deg, hsl(${(index * 40 + 220) % 360}, 70%, 65%), hsl(${(index * 40 + 260) % 360}, 80%, 55%))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '52px',
        position: 'relative', overflow: 'hidden',
      }}>
        {course.thumbnail
          ? <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>💡</span>
        }
        <div style={{
          position: 'absolute', top: '10px', left: '10px',
          padding: '4px 10px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.25)',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          backdropFilter: 'blur(8px)',
        }}>
          {course.level || 'All Levels'}
        </div>
      </div>
      <div style={{ padding: '18px' }}>
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          background: '#f3e8ff',
          color: '#7c3aed',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          marginBottom: '8px',
          letterSpacing: '0.04em',
        }}>
          {course.category || 'Technology'}
        </span>
        <h3 style={{
          fontFamily: 'Space Grotesk',
          fontSize: '15px', fontWeight: 700,
          color: '#15182d', margin: '0 0 8px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.35,
          minHeight: '40px',
        }}>{course.title}</h3>
        <p style={{
          fontSize: '13px', color: '#68708a', lineHeight: 1.5,
          margin: '0 0 12px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {course.description || 'Build practical skills with hands-on projects.'}
        </p>
        <div style={{
          display: 'flex', gap: '12px',
          fontSize: '12px', color: '#68708a',
          marginBottom: '14px',
        }}>
          <span>⏱ {course.durationHours ? `${course.durationHours}h` : 'Self-paced'}</span>
          <span>•</span>
          <span>📖 {course.totalLessons || '—'} lessons</span>
        </div>
        <button
          onClick={() => onEnroll(id)}
          disabled={isEnrolling}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '12px',
            background: isEnrolling ? '#e5e3fa' : 'linear-gradient(100deg, #7c3aed, #a78bfa)',
            color: isEnrolling ? '#7c3aed' : '#fff',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            cursor: isEnrolling ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: isEnrolling ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
          }}
        >
          {isEnrolling ? '⏳ Enrolling...' : '+ Enroll Now'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');
  const [headerVisible, setHeaderVisible] = useState(false);
  const [learningStreak, setLearningStreak] = useState(0);
  const [currentHour] = useState(() => new Date().getHours());
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, catRes, statsRes] = await Promise.all([
        studentService.getDashboard(),
        studentService.getCatalog().catch(() => ({ data: { courses: [] } })),
        learningStatsService.getStatistics('week').catch(() => ({ data: null })),
      ]);
      setData(dashRes.data?.dashboard || null);
      setCatalog(catRes.data?.courses || []);
      const summary = statsRes.data?.stats?.summary || statsRes.data?.summary || null;
      const streak = Number(summary?.currentStreak ?? summary?.currentStreakDays ?? 0);
      setLearningStreak(Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0);
    } catch (err) {
      addToast(err.message || 'Unable to load your learning data.', 'error');
    } finally {
      setLoading(false);
      setTimeout(() => setHeaderVisible(true), 100);
    }
  }, [addToast]);

  useEffect(() => { void Promise.resolve().then(loadData); }, [loadData]);

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    try {
      await studentService.enrollCourse(courseId);
      addToast('🎉 Enrolled successfully! Happy learning!', 'success');
      await loadData();
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already enrolled')) {
        navigate(`/courses/${courseId}/learn`);
        return;
      }
      addToast(msg || 'Unable to enroll in this course.', 'error');
    } finally {
      setEnrollingId(null);
    }
  };

  /* ── Loading Skeleton ── */
  if (loading) {
    return (
      <div style={{ padding: '20px 0' }}>
        {/* Hero skeleton */}
        <div style={{
          borderRadius: '28px',
          height: '220px',
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          marginBottom: '28px',
          animation: 'pulse 1.5s ease-in-out infinite',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
            animation: 'shimmer 1.5s infinite',
          }} />
        </div>
        {/* Stat cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '28px' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              borderRadius: '20px', height: '96px',
              background: '#fff', border: '1px solid #eeeef6',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
        </div>
        {/* Cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              borderRadius: '20px', height: '280px',
              background: '#fff', border: '1px solid #eeeef6',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Data ── */
  const enrolled = data?.enrolledCourses || 0;
  const active = data?.activeCourses || 0;
  const completed = data?.completedCourses || 0;
  const courses = data?.courses || [];
  const recent = data?.recentActivity || [];

  const totalCompletedLessons = courses.reduce((sum, c) => sum + (c.completedLessons || 0), 0);
  const avgProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + (c.progressPercent || 0), 0) / courses.length)
    : 0;

  const filteredCourses = courses.filter((c) => {
    if (courseFilter === 'active') return c.enrollmentStatus === 'active' && c.progressPercent < 100;
    if (courseFilter === 'completed') return c.enrollmentStatus === 'completed' || c.progressPercent === 100;
    return true;
  });

  const inProgressCourses = courses.filter(c => (c.progressPercent || 0) < 100 && c.enrollmentStatus !== 'completed');
  const completedCoursesList = courses.filter(c => (c.progressPercent || 0) === 100 || c.enrollmentStatus === 'completed');

  let resumeCourse = null;
  let resumeLessonTitle = '';
  if (recent.length > 0 && inProgressCourses.length > 0) {
    resumeCourse = inProgressCourses.find(c => c.title === recent[0].courseTitle || c.courseId === recent[0].courseId);
    if (resumeCourse) resumeLessonTitle = recent[0].lessonTitle;
  }
  if (!resumeCourse && inProgressCourses.length > 0) resumeCourse = inProgressCourses[0];
  if (!resumeCourse && completedCoursesList.length > 0) resumeCourse = completedCoursesList[0];
  const isCourseCompleted = resumeCourse && ((resumeCourse.progressPercent || 0) === 100 || resumeCourse.enrollmentStatus === 'completed');

  const enrolledIds = new Set(courses.map(c => String(c.id || c._id || c.courseId)));
  const recommendedCourses = catalog.filter(c => !enrolledIds.has(String(c.id || c._id || c.courseId))).slice(0, 4);

  const hour = currentHour;
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = hour < 5 ? '🌙' : hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙';
  const firstName = user?.fullName ? user.fullName.split(' ').slice(-1)[0] : 'there';

  /* ── Render ── */
  return (
    <div style={{ paddingBottom: '40px' }}>

      {/* ═══════════════════════════════════════════════════════
          1. HERO BANNER - Glassmorphism & Floating Orbs
      ═══════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0f0c3d 0%, #1e1b4b 30%, #2d2872 60%, #4338ca 100%)',
        borderRadius: '28px',
        padding: '36px 40px',
        marginBottom: '28px',
        overflow: 'hidden',
        boxShadow: '0 30px 70px rgba(30, 27, 75, 0.3), 0 0 0 1px rgba(255,255,255,0.05)',
        opacity: headerVisible ? 1 : 0,
        transform: headerVisible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}>
        {/* Floating orbs */}
        <FloatingOrb style={{ width: 350, height: 350, background: 'radial-gradient(circle, #818cf8, transparent)', top: '-100px', right: '-50px', animationDelay: '0s' }} />
        <FloatingOrb style={{ width: 250, height: 250, background: 'radial-gradient(circle, #a78bfa, transparent)', bottom: '-80px', left: '15%', animationDelay: '2s' }} />
        <FloatingOrb style={{ width: 200, height: 200, background: 'radial-gradient(circle, #60a5fa, transparent)', top: '20%', left: '-50px', animationDelay: '4s' }} />

        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '28px', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {/* Left: Greeting */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#c7d2fe',
              fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: '16px',
              animation: 'fadeInDown 0.6s ease 0.2s both',
            }}>
              <span style={{ animation: 'spin 3s linear infinite', display: 'inline-block' }}>✦</span>
              Your Learning Space
            </div>

            <h1 style={{
              fontFamily: 'Space Grotesk',
              fontSize: '34px', fontWeight: 800,
              color: '#fff',
              margin: '0 0 10px',
              lineHeight: 1.2,
              animation: 'fadeInDown 0.6s ease 0.3s both',
              textShadow: '0 2px 20px rgba(0,0,0,0.2)',
            }}>
              {greeting}, {firstName}! {greetingEmoji}
            </h1>

            <p style={{
              color: '#c7d2fe', fontSize: '15px', lineHeight: 1.6,
              maxWidth: '500px', margin: '0 0 22px',
              animation: 'fadeInDown 0.6s ease 0.4s both',
            }}>
              {courses.length > 0
                ? `Keep the momentum going — you're ${avgProgress}% through your journey!`
                : 'Start your learning journey today and build skills that matter.'}
            </p>

            {/* Chips */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '10px',
              animation: 'fadeInDown 0.6s ease 0.5s both',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '7px 16px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: '13px', fontWeight: 600,
              }}>
                🔥 Learning Streak: <strong style={{ color: '#fbbf24' }}>{learningStreak} {learningStreak === 1 ? 'day' : 'days'}</strong>
              </div>
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '7px 16px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => navigate('/learning-goals')}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.16)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              >
                🎯 Goals: <strong style={{ color: '#a5f3fc', textDecoration: 'underline' }}>View →</strong>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '7px 16px',
                borderRadius: '999px',
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#6ee7b7', fontSize: '13px', fontWeight: 600,
              }}>
                ⚡ Status: <strong>Ready to Learn</strong>
              </div>
            </div>
          </div>

          {/* Right: Stats pills */}
          <div style={{
            display: 'flex', gap: '14px', flexWrap: 'wrap',
            animation: 'fadeInRight 0.8s ease 0.4s both',
          }}>
            {[
              { num: active, label: 'In Progress', icon: '📚', color: '#818cf8' },
              { num: completed, label: 'Completed', icon: '🏆', color: '#34d399' },
              { num: `${avgProgress}%`, label: 'Avg Progress', icon: '⚡', color: '#fbbf24' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '20px',
                padding: '18px 22px',
                minWidth: '110px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{stat.icon}</div>
                <div style={{
                  fontFamily: 'Space Grotesk',
                  fontSize: '30px', fontWeight: 800,
                  color: stat.color,
                  lineHeight: 1,
                  textShadow: `0 0 20px ${stat.color}60`,
                }}>
                  {stat.num}
                </div>
                <div style={{ fontSize: '12px', color: '#c7d2fe', marginTop: '4px', fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overall progress bar */}
        {courses.length > 0 && (
          <div style={{
            marginTop: '28px',
            padding: '18px 22px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative', zIndex: 1,
            animation: 'fadeInUp 0.6s ease 0.6s both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#c7d2fe', fontSize: '13px', fontWeight: 600 }}>
                🎓 Overall Learning Progress
              </span>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 800 }}>
                {avgProgress}% Complete
              </span>
            </div>
            <AnimatedProgress percent={avgProgress} color="linear-gradient(90deg, #818cf8, #a78bfa, #60a5fa)" delay={400} />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              color: 'rgba(199,210,254,0.7)', fontSize: '12px',
              marginTop: '6px',
            }}>
              <span>{totalCompletedLessons} lessons completed</span>
              <span>{enrolled} courses enrolled</span>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. STAT CARDS
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px',
        marginBottom: '32px',
      }}>
        <StatCard icon="📚" label="Courses In Progress" value={active} gradient="linear-gradient(135deg, #6366f1, #818cf8)" delay={100} />
        <StatCard icon="✅" label="Lessons Completed" value={totalCompletedLessons} gradient="linear-gradient(135deg, #10b981, #34d399)" delay={200} />
        <StatCard icon="🏆" label="Certificates Earned" value={completed} gradient="linear-gradient(135deg, #f59e0b, #fbbf24)" delay={300} />
        <StatCard icon="⚡" label="Avg. Progress" value={avgProgress} suffix="%" gradient="linear-gradient(135deg, #8b5cf6, #a78bfa)" delay={400} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          3. RESUME / SPOTLIGHT CARD
      ═══════════════════════════════════════════════════════ */}
      {resumeCourse ? (
        <section style={{
          background: isCourseCompleted
            ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
            : 'linear-gradient(135deg, #faf9ff, #f5f3ff)',
          borderRadius: '24px',
          border: `1.5px solid ${isCourseCompleted ? '#a7f3d0' : '#dcd8fc'}`,
          padding: '28px',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isCourseCompleted
            ? '0 20px 50px rgba(16,185,129,0.1)'
            : '0 20px 50px rgba(67,56,202,0.08)',
          animation: 'fadeInUp 0.6s ease 0.4s both',
        }}>
          {/* Decorative blob */}
          <div style={{
            position: 'absolute',
            width: '300px', height: '300px',
            background: isCourseCompleted
              ? 'radial-gradient(circle, rgba(16,185,129,0.08), transparent)'
              : 'radial-gradient(circle, rgba(99,102,241,0.06), transparent)',
            borderRadius: '50%',
            top: '-100px', right: '-80px',
            pointerEvents: 'none',
          }} />

          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: isCourseCompleted ? '#dcfce7' : '#ede9fe',
              border: `1px solid ${isCourseCompleted ? '#a7f3d0' : '#c4b5fd'}`,
              color: isCourseCompleted ? '#059669' : '#6d28d9',
              fontSize: '12px', fontWeight: 800,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              <span>{isCourseCompleted ? '🏆' : '▶'}</span>
              {isCourseCompleted ? 'Course Completed — Amazing Work!' : 'Keep Learning · Reach Your Goal'}
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: isCourseCompleted ? '#10b981' : '#6366f1' }}>
              {resumeCourse.progressPercent}% done
            </span>
          </div>

          {/* Body */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: '24px',
            alignItems: 'center',
          }}>
            {/* Thumbnail */}
            <div style={{
              width: '180px', height: '120px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '44px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}>
              {resumeCourse.thumbnail
                ? <img src={resumeCourse.thumbnail} alt={resumeCourse.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{isCourseCompleted ? '🎓' : '💻'}</span>
              }
            </div>

            {/* Info */}
            <div>
              <div style={{
                display: 'inline-block',
                padding: '3px 10px',
                background: isCourseCompleted ? '#ecfdf5' : '#ede9fe',
                color: isCourseCompleted ? '#065f46' : '#6d28d9',
                borderRadius: '999px',
                fontSize: '11px', fontWeight: 700,
                marginBottom: '10px',
                border: `1px solid ${isCourseCompleted ? '#a7f3d0' : '#c4b5fd'}`,
              }}>
                {isCourseCompleted ? '✓ 100% Completed' : 'In Progress'}
              </div>

              <h2 style={{
                fontFamily: 'Space Grotesk',
                fontSize: '20px', fontWeight: 800,
                color: '#15182d', margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                {resumeCourse.title}
              </h2>

              {isCourseCompleted ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: '#047857', fontSize: '14px', fontWeight: 600, marginBottom: '10px',
                }}>
                  <span>🎉</span>
                  <span>Certificate issued — You've completed all lessons!</span>
                </div>
              ) : resumeLessonTitle && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: '#4b5563', fontSize: '14px', marginBottom: '10px',
                }}>
                  <span>📖</span>
                  <span>Next: <strong>{resumeLessonTitle}</strong></span>
                </div>
              )}

              {/* Progress bar */}
              <div style={{ background: isCourseCompleted ? '#d1fae5' : '#ede9fe', borderRadius: '999px', height: '8px', overflow: 'hidden', maxWidth: '400px', marginBottom: '6px' }}>
                <div style={{
                  width: `${resumeCourse.progressPercent}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: isCourseCompleted
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #6366f1, #a78bfa)',
                  transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: isCourseCompleted ? '0 0 8px rgba(16,185,129,0.4)' : '0 0 8px rgba(99,102,241,0.4)',
                }} />
              </div>
              <span style={{ fontSize: '12px', color: '#68708a', fontWeight: 500 }}>
                {resumeCourse.completedLessons}/{resumeCourse.totalLessons} lessons
              </span>
            </div>

            {/* Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '160px' }}>
              {isCourseCompleted ? (
                <>
                  <button
                    onClick={() => navigate('/certificates')}
                    style={{
                      padding: '13px 20px',
                      borderRadius: '14px',
                      background: 'linear-gradient(100deg, #10b981, #34d399)',
                      color: '#fff',
                      fontWeight: 700, fontSize: '14px',
                      border: 'none', cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(16,185,129,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(16,185,129,0.45)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(16,185,129,0.35)'; }}
                  >
                    📜 View Certificate →
                  </button>
                  <button
                    onClick={() => navigate(`/courses/${resumeCourse.courseId}/learn`)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: '#fff',
                      color: '#059669',
                      fontWeight: 600, fontSize: '13px',
                      border: '1.5px solid #a7f3d0',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    Review Lessons 🔄
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate(`/courses/${resumeCourse.courseId}/learn`)}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '14px',
                    background: 'linear-gradient(100deg, #4338ca, #6366f1)',
                    color: '#fff',
                    fontWeight: 700, fontSize: '15px',
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 10px 24px rgba(67,56,202,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.25s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 16px 35px rgba(67,56,202,0.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(67,56,202,0.35)'; }}
                >
                  ▶ Continue Learning
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* Empty State - No courses */
        <section style={{
          background: 'linear-gradient(135deg, #faf9ff, #f5f3ff)',
          borderRadius: '24px',
          border: '1.5px dashed #c4b5fd',
          padding: '52px 32px',
          marginBottom: '32px',
          textAlign: 'center',
          animation: 'fadeInUp 0.6s ease 0.4s both',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>🚀</div>
          <h2 style={{
            fontFamily: 'Space Grotesk',
            fontSize: '24px', fontWeight: 800,
            color: '#15182d', margin: '0 0 10px',
          }}>
            Start Building Your Skills
          </h2>
          <p style={{ color: '#68708a', fontSize: '15px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Choose from hundreds of courses in AI, programming, and digital skills. Earn certificates and grow your career.
          </p>
          <Link to="/courses" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 28px',
            borderRadius: '14px',
            background: 'linear-gradient(100deg, #4338ca, #6366f1)',
            color: '#fff',
            fontWeight: 700, fontSize: '15px',
            textDecoration: 'none',
            boxShadow: '0 10px 24px rgba(67,56,202,0.3)',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(67,56,202,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(67,56,202,0.3)'; }}
          >
            Explore Courses →
          </Link>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          4. MY COURSES
      ═══════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: '40px' }}>
        {/* Section header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'Space Grotesk',
              fontSize: '22px', fontWeight: 800,
              color: '#15182d', margin: '0 0 4px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                fontSize: '16px',
              }}>📚</span>
              My Courses
            </h2>
            <p style={{ color: '#68708a', fontSize: '13px', margin: 0 }}>
              Track your progress across all enrolled courses
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Filter pills */}
            <div style={{
              display: 'flex', gap: '4px',
              background: '#f3f2fb',
              padding: '4px',
              borderRadius: '14px',
            }}>
              {[
                { key: 'all', label: `All (${courses.length})` },
                { key: 'active', label: `Active (${courses.filter(c => c.progressPercent < 100).length})` },
                { key: 'completed', label: `Done (${courses.filter(c => c.progressPercent === 100).length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setCourseFilter(tab.key)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '10px',
                    fontSize: '13px', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    background: courseFilter === tab.key ? '#fff' : 'transparent',
                    color: courseFilter === tab.key ? '#4338ca' : '#68708a',
                    boxShadow: courseFilter === tab.key ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
                    transform: courseFilter === tab.key ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link to="/courses" style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#fff',
              border: '1.5px solid #e0deff',
              color: '#4338ca',
              fontWeight: 700, fontSize: '13px',
              textDecoration: 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#a78bfa'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e0deff'; }}
            >
              Browse All →
            </Link>
          </div>
        </div>

        {/* Course grid */}
        {courses.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: '20px',
            border: '1px solid #eeeef6',
            padding: '52px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(40,32,104,0.04)',
          }}>
            <div style={{ fontSize: '52px', marginBottom: '12px', opacity: 0.5 }}>📚</div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
              No courses yet
            </h3>
            <p style={{ color: '#68708a', fontSize: '14px', maxWidth: '380px', margin: '0 auto 20px' }}>
              Explore our catalog and start your first course today!
            </p>
            <Link to="/courses" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '12px 24px', borderRadius: '12px',
              background: 'linear-gradient(100deg, #4338ca, #6366f1)',
              color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              boxShadow: '0 6px 16px rgba(67,56,202,0.3)',
            }}>
              Explore Courses
            </Link>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '20px',
            border: '1px solid #eeeef6', padding: '40px',
            textAlign: 'center', color: '#68708a',
            boxShadow: '0 4px 20px rgba(40,32,104,0.04)',
          }}>
            No courses match this filter.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {filteredCourses.map((c, i) => (
              <CourseCard
                key={c.courseId}
                course={c}
                index={i}
                onAction={(course) => {
                  if (course.progressPercent === 100 || course.enrollmentStatus === 'completed') {
                    navigate('/certificates');
                  } else {
                    navigate(`/courses/${course.courseId}/learn`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          5. RECOMMENDED COURSES
      ═══════════════════════════════════════════════════════ */}
      {recommendedCourses.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
          }}>
            <div>
              <h2 style={{
                fontFamily: 'Space Grotesk',
                fontSize: '22px', fontWeight: 800,
                color: '#15182d', margin: '0 0 4px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                  fontSize: '16px',
                }}>✨</span>
                Recommended For You
              </h2>
              <p style={{ color: '#68708a', fontSize: '13px', margin: 0 }}>
                Hand-picked courses to level up your skills
              </p>
            </div>
            <Link to="/courses" style={{
              padding: '8px 16px', borderRadius: '10px',
              background: '#fff', border: '1.5px solid #e0deff',
              color: '#7c3aed', fontWeight: 700, fontSize: '13px',
              textDecoration: 'none', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#c4b5fd'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e0deff'; }}
            >
              View All →
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {recommendedCourses.map((c, i) => (
              <RecoCard
                key={c._id || c.courseId}
                course={c}
                index={i}
                onEnroll={handleEnroll}
                enrollingId={enrollingId}
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          6. RECENT ACTIVITY TIMELINE
      ═══════════════════════════════════════════════════════ */}
      {recent.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px',
          }}>
            <div>
              <h2 style={{
                fontFamily: 'Space Grotesk',
                fontSize: '22px', fontWeight: 800,
                color: '#15182d', margin: '0 0 4px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                  fontSize: '16px',
                }}>🕒</span>
                Recent Activity
              </h2>
              <p style={{ color: '#68708a', fontSize: '13px', margin: 0 }}>
                Lessons you recently worked on
              </p>
            </div>
            <Link to="/history" style={{
              padding: '8px 16px', borderRadius: '10px',
              background: '#fff', border: '1.5px solid #fde68a',
              color: '#b45309', fontWeight: 700, fontSize: '13px',
              textDecoration: 'none', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fffbeb'; e.currentTarget.style.borderColor = '#f59e0b'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#fde68a'; }}
            >
              View History →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recent.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 22px',
                  background: '#fff',
                  border: '1px solid #eeeef6',
                  borderRadius: '16px',
                  boxShadow: '0 2px 10px rgba(40,32,104,0.04)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  animation: `fadeInUp 0.5s ease ${idx * 80}ms both`,
                  cursor: item.courseId ? 'pointer' : 'default',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#dcd8fc';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(40,32,104,0.1)';
                  e.currentTarget.style.transform = 'translateX(6px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#eeeef6';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(40,32,104,0.04)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
                onClick={() => item.courseId && navigate(`/courses/${item.courseId}/learn`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Icon */}
                  <div style={{
                    width: '44px', height: '44px',
                    borderRadius: '14px',
                    background: item.status === 'completed'
                      ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                      : 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                    color: item.status === 'completed' ? '#15803d' : '#6d28d9',
                    display: 'grid', placeItems: 'center',
                    fontSize: '20px', flexShrink: 0,
                  }}>
                    {item.status === 'completed' ? '✅' : '📖'}
                  </div>
                  {/* Text */}
                  <div>
                    <div style={{ fontSize: '12px', color: '#68708a', fontWeight: 600, marginBottom: '3px' }}>
                      {item.courseTitle}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#15182d' }}>
                      {item.lessonTitle}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: item.status === 'completed' ? '#dcfce7' : '#ede9fe',
                    color: item.status === 'completed' ? '#166534' : '#6d28d9',
                    fontSize: '11px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {item.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#68708a', whiteSpace: 'nowrap' }}>
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Recently'}
                  </span>
                  {item.courseId && (
                    <div style={{
                      width: '32px', height: '32px',
                      borderRadius: '10px',
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#6d28d9', fontSize: '14px',
                    }}>→</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
