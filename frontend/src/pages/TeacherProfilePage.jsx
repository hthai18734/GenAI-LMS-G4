import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicService } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/Toast';

export default function TeacherProfilePage() {
  const { teacherId } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeacher() {
      setLoading(true);
      try {
        const res = await publicService.getTeacherProfile(teacherId);
        if (res.data) {
          setTeacher(res.data.teacher);
          setCourses(res.data.publishedCourses || []);
        }
      } catch (err) {
        addToast(err.message || 'Teacher profile not found', 'error');
      } finally {
        setLoading(false);
      }
    }

    if (teacherId) {
      fetchTeacher();
    }
  }, [teacherId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Teacher profile not found</h2>
        <p style={{ color: 'var(--text-dim)', margin: '16px 0 24px' }}>
          The instructor you are looking for does not exist or has not been approved yet.
        </p>
        <Link to="/explore" className="btn btn-primary">
          Explore Courses
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
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

      <main style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
        {/* Profile Card */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--line)',
          padding: '32px',
          display: 'flex',
          gap: '24px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '40px'
        }}>
          {teacher.avatar ? (
            <img
              src={teacher.avatar}
              alt={teacher.fullName}
              style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: '700'
            }}>
              {teacher.fullName ? teacher.fullName[0].toUpperCase() : 'T'}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>
                {teacher.fullName}
              </h1>
              <span className="badge" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                Verified Instructor
              </span>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
              {teacher.bio || 'Dedicated educator passionate about teaching and mentoring students on AI-LMS.'}
            </p>
          </div>
        </div>

        {/* Courses Section */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
            Courses by {teacher.fullName} ({courses.length})
          </h2>

          {courses.length === 0 ? (
            <div style={{
              padding: '40px',
              background: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--line)',
              textAlign: 'center',
              color: 'var(--text-dim)'
            }}>
              This instructor has not published any public courses yet.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px'
            }}>
              {courses.map((course) => (
                <Link
                  key={course._id}
                  to={`/courses/${course._id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    overflow: 'hidden',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ height: '140px', background: 'var(--bg-subtle)' }}>
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: '#fff'
                        }}>
                          📚
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>
                        {course.title}
                      </h4>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#f59e0b' }}>
                          ★ {course.averageRating ? course.averageRating.toFixed(1) : '5.0'}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                          {course.price > 0 ? `$${course.price}` : 'Free'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
