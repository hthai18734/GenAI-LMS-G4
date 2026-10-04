import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicService, studentService } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/Toast';

export default function PublicCourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [course, setCourse] = useState(null);
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const res = await publicService.getCourseDetail(courseId);
        if (res.data) {
          setCourse(res.data.course);
          setInstructor(res.data.instructor);
        }
      } catch (err) {
        addToast(err.message || 'Course not found', 'error');
      } finally {
        setLoading(false);
      }
    }
    if (courseId) {
      fetchDetail();
    }
  }, [courseId]);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      addToast('Please log in to enroll in this course.', 'info');
      navigate('/login');
      return;
    }

    setEnrolling(true);
    try {
      await studentService.enrollCourse(courseId);
      addToast('Enrolled successfully! Redirecting to study...', 'success');
      navigate('/courses');
    } catch (err) {
      addToast(err.message || 'Enrollment failed.', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Course not found</h2>
        <p style={{ color: 'var(--text-dim)', margin: '16px 0 24px' }}>
          The course you are looking for does not exist or is no longer published.
        </p>
        <Link to="/explore" className="btn btn-primary">
          Explore Other Courses
        </Link>
      </div>
    );
  }

  const teacherId = instructor?._id || course.instructorId || course.teacherId;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Top Bar */}
      <header className="landing-bar" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <Link to="/" className="brand compact" style={{ textDecoration: 'none' }}>
          <div className="brand-logo">
            <img src="/assets/images/logo.jpg" alt="AI-LMS" />
          </div>
          <div className="brand-name">AI-LMS</div>
        </Link>
        <nav className="landing-nav">
          <Link to="/explore">Explore Courses</Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ padding: '6px 14px' }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register" className="primary">Create account</Link>
            </>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--text-dim)' }}>
          <Link to="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link to="/explore" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Courses</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: 'var(--text)' }}>{course.title}</span>
        </div>

        {/* Hero Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          background: 'var(--surface)',
          padding: '32px',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          marginBottom: '40px'
        }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                {course.category || 'General'}
              </span>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                ★ {course.averageRating ? course.averageRating.toFixed(1) : '5.0'} Rating
              </span>
              {course.totalStudents > 0 && (
                <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--text-dim)' }}>
                  👥 {course.totalStudents} Students
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px', lineHeight: 1.3 }}>
              {course.title}
            </h1>

            <p style={{ color: 'var(--text-dim)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
              {course.description || 'No description provided for this course yet.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>
                {course.price > 0 ? `$${course.price}` : 'Free'}
              </div>
              {course.discountPrice && (
                <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', fontSize: '18px' }}>
                  ${course.discountPrice}
                </span>
              )}
            </div>

            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="btn btn-primary"
              style={{
                width: '100%',
                maxWidth: '280px',
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {enrolling ? 'Enrolling...' : (course.price > 0 ? 'Enroll Now' : 'Start Learning Free')}
            </button>
          </div>

          <div>
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--line)' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '280px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '48px',
                fontWeight: '700'
              }}>
                📚
              </div>
            )}
          </div>
        </div>

        {/* Instructor Summary Section */}
        {instructor && (
          <div style={{
            background: 'var(--surface)',
            padding: '28px',
            borderRadius: '16px',
            border: '1px solid var(--line)',
            marginBottom: '40px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
              Course Instructor
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {instructor.avatar ? (
                <img
                  src={instructor.avatar}
                  alt={instructor.fullName}
                  style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'var(--primary-subtle, #e0e7ff)',
                  color: 'var(--primary, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  {instructor.fullName ? instructor.fullName[0].toUpperCase() : 'T'}
                </div>
              )}

              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px' }}>
                  {instructor.fullName}
                </h4>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  {instructor.bio || 'Experienced educator and curriculum specialist on AI-LMS.'}
                </p>
              </div>

              {teacherId && (
                <Link
                  to={`/teachers/${teacherId}`}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  View Teacher Profile →
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
