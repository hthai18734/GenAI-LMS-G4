import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../services/api';
import { useToast } from '../components/Toast';

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState('enrolled');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [enrolledRes, catalogRes] = await Promise.all([
        studentService.getEnrolledCourses().catch(() => ({ data: { courses: [] } })),
        studentService.getCatalog().catch(() => ({ data: { courses: [] } })),
      ]);
      setEnrolledCourses(enrolledRes.data?.courses || []);
      setCatalogCourses(catalogRes.data?.courses || []);
    } catch {
      addToast('Failed to load courses data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    try {
      await studentService.enrollCourse(courseId);
      addToast('Successfully enrolled in course!', 'success');
      await loadData();
      setActiveTab('enrolled');
    } catch (err) {
      addToast(err.message || 'Failed to enroll in course.', 'error');
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`btn ${activeTab === 'enrolled' ? 'btn-primary' : 'btn-secondary'}`}
        >
          My Enrolled Courses ({enrolledCourses.length})
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Explore Catalog ({catalogCourses.length})
        </button>
      </div>

      {/* Tab: Enrolled Courses */}
      {activeTab === 'enrolled' && (
        <div>
          {enrolledCourses.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6' }}>
              <div className="empty-icon">📖</div>
              <h3>No enrolled courses found</h3>
              <p>You haven't enrolled in any courses yet. Browse the catalog to find a course you'd like to learn!</p>
              <div style={{ marginTop: '16px' }}>
                <button onClick={() => setActiveTab('catalog')} className="btn btn-primary">
                  Explore Catalog
                </button>
              </div>
            </div>
          ) : (
            <div className="course-grid">
              {enrolledCourses.map((c) => (
                <div key={c.enrollmentId || c.courseId} className="course-card">
                  <div className="course-thumb">
                    {c.thumbnail ? (
                      <img src={c.thumbnail} alt={c.title} />
                    ) : (
                      <span>📚</span>
                    )}
                  </div>
                  <div className="course-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`badge badge-${c.enrollmentStatus}`}>
                        {c.enrollmentStatus}
                      </span>
                      {c.category && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                          {c.category}
                        </span>
                      )}
                    </div>
                    <h3 className="course-title">{c.title}</h3>
                    <p className="course-desc">{c.description || 'No description provided.'}</p>
                    <div className="progress-wrap">
                      <div
                        className="progress-fill"
                        style={{ width: `${c.progressPercent}%` }}
                      ></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span className="progress-text">{c.completedLessons} / {c.totalLessons} lessons</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--purple)' }}>{c.progressPercent}%</span>
                    </div>
                    <button
                      onClick={() => navigate(`/courses/${c.courseId}/learn`)}
                      className="btn btn-primary btn-sm btn-full"
                    >
                      {c.progressPercent === 100 ? 'Review Course' : 'Resume Learning'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Catalog Courses */}
      {activeTab === 'catalog' && (
        <div>
          {catalogCourses.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid #eeeef6' }}>
              <div className="empty-icon">🔍</div>
              <h3>No courses available in catalog</h3>
              <p>There are currently no open courses available for enrollment.</p>
            </div>
          ) : (
            <div className="course-grid">
              {catalogCourses.map((c) => (
                <div key={c.id} className="course-card">
                  <div className="course-thumb">
                    {c.thumbnail ? (
                      <img src={c.thumbnail} alt={c.title} />
                    ) : (
                      <span>💡</span>
                    )}
                  </div>
                  <div className="course-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="badge badge-active">{c.status}</span>
                      {c.category && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                          {c.category}
                        </span>
                      )}
                    </div>
                    <h3 className="course-title">{c.title}</h3>
                    <p className="course-desc">{c.description || 'No description provided.'}</p>
                    <div className="course-meta">
                      <span>📖 {c.totalLessons} Lessons</span>
                      {c.duration ? <span>⏱ {c.duration} Hours</span> : null}
                    </div>

                    {c.isEnrolled ? (
                      <button
                        onClick={() => navigate(`/courses/${c.id}/learn`)}
                        className="btn btn-secondary btn-sm btn-full"
                      >
                        Enrolled · Learn Now
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(c.id)}
                        disabled={enrollingId === c.id}
                        className="btn btn-primary btn-sm btn-full"
                      >
                        {enrollingId === c.id ? 'Enrolling...' : 'Enroll in Course'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
