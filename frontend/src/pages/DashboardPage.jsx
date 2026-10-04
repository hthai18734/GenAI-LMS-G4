import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentService } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/Toast';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, catRes] = await Promise.all([
        studentService.getDashboard(),
        studentService.getCatalog().catch(() => ({ data: { courses: [] } })),
      ]);
      setData(dashRes.data?.dashboard || null);
      setCatalog(catRes.data?.courses || []);
    } catch (err) {
      addToast(err.message || 'Không thể tải dữ liệu học tập.', 'error');
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
      addToast('Đăng ký khóa học thành công! Chúc bạn học tốt.', 'success');
      await loadData();
    } catch (err) {
      addToast(err.message || 'Đăng ký khóa học thất bại.', 'error');
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const enrolled = data?.enrolledCourses || 0;
  const active = data?.activeCourses || 0;
  const completed = data?.completedCourses || 0;
  const courses = data?.courses || [];
  const recent = data?.recentActivity || [];

  // Calculate total completed lessons and average progress
  const totalCompletedLessons = courses.reduce((sum, c) => sum + (c.completedLessons || 0), 0);
  const avgProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + (c.progressPercent || 0), 0) / courses.length)
    : 0;

  // Filter courses based on tab
  const filteredCourses = courses.filter((c) => {
    if (courseFilter === 'active') return c.enrollmentStatus === 'active' && c.progressPercent < 100;
    if (courseFilter === 'completed') return c.enrollmentStatus === 'completed' || c.progressPercent === 100;
    return true;
  });

  // Separate in-progress courses (< 100%) and completed courses (100%)
  const inProgressCourses = courses.filter((c) => (c.progressPercent || 0) < 100 && c.enrollmentStatus !== 'completed');
  const completedCoursesList = courses.filter((c) => (c.progressPercent || 0) === 100 || c.enrollmentStatus === 'completed');

  // Identify the best course to feature in Spotlight:
  // 1. Prioritize in-progress courses so learner continues what is unfinished
  let resumeCourse = null;
  let resumeLessonTitle = '';

  if (recent.length > 0 && inProgressCourses.length > 0) {
    resumeCourse = inProgressCourses.find((c) => c.title === recent[0].courseTitle || c.courseId === recent[0].courseId);
    if (resumeCourse) {
      resumeLessonTitle = recent[0].lessonTitle;
    }
  }

  if (!resumeCourse && inProgressCourses.length > 0) {
    resumeCourse = inProgressCourses[0];
  }

  // 2. If ALL courses are 100% completed, show the most recent completed course in Celebration/Graduation mode
  if (!resumeCourse && completedCoursesList.length > 0) {
    resumeCourse = completedCoursesList[0];
  }

  const isCourseCompleted = resumeCourse && ((resumeCourse.progressPercent || 0) === 100 || resumeCourse.enrollmentStatus === 'completed');

  // Filter catalog courses that the student hasn't enrolled in yet
  const enrolledCourseIds = new Set(courses.map((c) => String(c.id || c._id || c.courseId)));
  const recommendedCourses = catalog
    .filter((c) => !enrolledCourseIds.has(String(c.id || c._id || c.courseId)))
    .slice(0, 4);

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const firstName = user?.fullName ? user.fullName.split(' ').slice(-1)[0] : 'bạn';

  return (
    <div>
      {/* ─── 1. Learner Hero Banner ────────────────────────────────── */}
      <section className="learner-hero">
        <div className="learner-hero-left">
          <div className="learner-badge">
            <span>✨</span> KHÔNG GIAN HỌC TẬP CỦA BẠN
          </div>
          <h1 className="learner-hero-title">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="learner-hero-desc">
            Tiếp tục bài học hôm nay để duy trì chuỗi tiến bộ và mở rộng kỹ năng chuyên môn của bạn nhé!
          </p>
          <div className="learner-chips">
            <div className="learner-chip">
              <span>🔥</span> Chuỗi học tập: <strong>3 ngày liên tiếp</strong>
            </div>
            <div className="learner-chip">
              <span>🎯</span> Mục tiêu hôm nay: <strong>Hoàn thành 1 bài học</strong>
            </div>
            <div className="learner-chip">
              <span>⚡</span> Trạng thái: <strong>Sẵn sàng bứt phá</strong>
            </div>
          </div>
        </div>
        <div className="learner-hero-right">
          <div className="hero-stat-pill">
            <div className="hero-stat-num">{active}</div>
            <div className="hero-stat-lbl">Đang học</div>
          </div>
          <div className="hero-stat-pill">
            <div className="hero-stat-num">{completed}</div>
            <div className="hero-stat-lbl">Hoàn thành</div>
          </div>
          <div className="hero-stat-pill">
            <div className="hero-stat-num">{avgProgress}%</div>
            <div className="hero-stat-lbl">Tiến độ chung</div>
          </div>
        </div>
      </section>

      {/* ─── 2. Spotlight: Resume Learning or Graduation Card ─────── */}
      {resumeCourse ? (
        <section
          className="continue-card"
          style={isCourseCompleted ? { borderLeft: '4px solid #10b981', background: 'linear-gradient(135deg, #ffffff, #f0fdf4)' } : {}}
        >
          <div className="continue-header">
            <div
              className="continue-tag"
              style={isCourseCompleted ? { color: '#059669', background: '#d1fae5', borderColor: '#a7f3d0' } : {}}
            >
              <span>{isCourseCompleted ? '🏆' : '▶'}</span>
              {isCourseCompleted ? ' XUẤT SẮC · BẠN ĐÃ HOÀN THÀNH KHÓA HỌC NÀY' : ' TIẾP TỤC HỌC NGAY · ĐỪNG BỎ LỠ MỤC TIÊU'}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
              Tiến độ: <strong style={{ color: isCourseCompleted ? '#10b981' : 'var(--purple)' }}>{resumeCourse.progressPercent}%</strong>
            </span>
          </div>
          <div className="continue-body">
            <div className="continue-thumb">
              {resumeCourse.thumbnail ? (
                <img src={resumeCourse.thumbnail} alt={resumeCourse.title} />
              ) : (
                <span>{isCourseCompleted ? '🎓' : '💻'}</span>
              )}
            </div>
            <div className="continue-info">
              <span
                className={`badge badge-${resumeCourse.enrollmentStatus}`}
                style={{
                  alignSelf: 'flex-start',
                  background: isCourseCompleted ? '#ecfdf5' : undefined,
                  color: isCourseCompleted ? '#065f46' : undefined,
                  border: isCourseCompleted ? '1px solid #a7f3d0' : undefined,
                }}
              >
                {isCourseCompleted ? '✓ Đã hoàn thành 100%' : 'Đang học'}
              </span>
              <h2 className="continue-course-title">{resumeCourse.title}</h2>

              {isCourseCompleted ? (
                <div className="continue-lesson-title" style={{ color: '#047857' }}>
                  <span>🎉</span>
                  <span><strong>Chứng chỉ đã được cấp!</strong> Bạn đã hoàn thành tất cả bài giảng và đạt điều kiện tốt nghiệp.</span>
                </div>
              ) : resumeLessonTitle ? (
                <div className="continue-lesson-title">
                  <span>📖</span>
                  <span>Bài học tiếp theo: <strong>{resumeLessonTitle}</strong></span>
                </div>
              ) : null}

              <div className="progress-wrap" style={{ margin: '8px 0 4px', maxWidth: '420px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${resumeCourse.progressPercent}%`,
                    background: isCourseCompleted ? '#10b981' : undefined,
                  }}
                ></div>
              </div>
              <span className="progress-text">
                {resumeCourse.completedLessons} / {resumeCourse.totalLessons} bài học hoàn thành
              </span>
            </div>
            <div className="continue-btn-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '170px' }}>
              {isCourseCompleted ? (
                <>
                  <button
                    onClick={() => navigate('/certificates')}
                    className="btn btn-primary"
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981',
                      padding: '12px 18px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <span>📜 Xem chứng chỉ</span>
                    <span>&rarr;</span>
                  </button>
                  <button
                    onClick={() => navigate(`/courses/${resumeCourse.courseId}/learn`)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 500, fontSize: '12px' }}
                    title="Xem lại các bài giảng đã học"
                  >
                    Ôn lại bài học 🔄
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate(`/courses/${resumeCourse.courseId}/learn`)}
                  className="btn-resume"
                >
                  <span>Học tiếp ngay</span>
                  <span>&rarr;</span>
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* Empty Spotlight when learner has no courses yet */
        <section className="continue-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🚀</div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
            Bắt đầu hành trình nâng cao kỹ năng của bạn
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 20px' }}>
            Chọn ngay một khóa học hấp dẫn từ danh mục của chúng tôi để bắt đầu học tập và nhận chứng chỉ nhé.
          </p>
          <Link to="/courses" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
            Khám phá danh mục khóa học &rarr;
          </Link>
        </section>
      )}

      {/* ─── 3. Learner Quick Metrics (Student-Oriented) ────────────── */}
      <section className="learner-stats-grid">
        <div className="learner-stat-card">
          <div className="learner-stat-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            📚
          </div>
          <div className="learner-stat-content">
            <div className="learner-stat-val">{active}</div>
            <div className="learner-stat-lbl">Khóa học đang học</div>
          </div>
        </div>

        <div className="learner-stat-card">
          <div className="learner-stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            ✅
          </div>
          <div className="learner-stat-content">
            <div className="learner-stat-val">{totalCompletedLessons}</div>
            <div className="learner-stat-lbl">Bài học đã hoàn thành</div>
          </div>
        </div>

        <div className="learner-stat-card">
          <div className="learner-stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            🏆
          </div>
          <div className="learner-stat-content">
            <div className="learner-stat-val">{completed}</div>
            <div className="learner-stat-lbl">Chứng chỉ đã đạt</div>
          </div>
        </div>

        <div className="learner-stat-card">
          <div className="learner-stat-icon" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            ⚡
          </div>
          <div className="learner-stat-content">
            <div className="learner-stat-val">{avgProgress}%</div>
            <div className="learner-stat-lbl">Tiến độ trung bình</div>
          </div>
        </div>
      </section>

      {/* ─── 4. My Courses Section with Filter Tabs ─────────────────── */}
      <section style={{ marginBottom: '38px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="section-title" style={{ margin: '0 0 4px' }}>Khóa học của tôi</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              Theo dõi và tiếp tục học tập các khóa học bạn đã đăng ký
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="pills-bar">
              <button
                onClick={() => setCourseFilter('all')}
                className={`pill-btn ${courseFilter === 'all' ? 'active' : ''}`}
              >
                Tất cả ({courses.length})
              </button>
              <button
                onClick={() => setCourseFilter('active')}
                className={`pill-btn ${courseFilter === 'active' ? 'active' : ''}`}
              >
                Đang học ({courses.filter(c => c.progressPercent < 100).length})
              </button>
              <button
                onClick={() => setCourseFilter('completed')}
                className={`pill-btn ${courseFilter === 'completed' ? 'active' : ''}`}
              >
                Hoàn thành ({courses.filter(c => c.progressPercent === 100).length})
              </button>
            </div>

            <Link to="/courses" className="btn btn-secondary btn-sm">
              Tất cả khóa học &rarr;
            </Link>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="empty-state" style={{ background: 'var(--panel)', borderRadius: '16px', border: '1px solid #eeeef6', padding: '40px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
              Bạn chưa đăng ký khóa học nào
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 18px' }}>
              Khám phá danh mục các khóa học lập trình, AI và kỹ năng số để bắt đầu lộ trình học tập ngay hôm nay.
            </p>
            <Link to="/courses" className="btn btn-primary">
              Khám phá danh mục khóa học
            </Link>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{ background: 'var(--panel)', borderRadius: '16px', border: '1px solid #eeeef6', padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
            Không có khóa học nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="course-grid">
            {filteredCourses.map((c) => (
              <div key={c.courseId} className="course-card">
                <div className="course-thumb">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt={c.title} />
                  ) : (
                    <span>💻</span>
                  )}
                </div>
                <div className="course-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className={`badge badge-${c.enrollmentStatus}`}>
                      {c.enrollmentStatus === 'completed' ? 'Hoàn thành' : 'Đang học'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple)' }}>
                      {c.progressPercent}%
                    </span>
                  </div>

                  <h3 className="course-title" style={{ minHeight: '44px' }}>{c.title}</h3>

                  <div className="progress-wrap">
                    <div
                      className="progress-fill"
                      style={{ width: `${c.progressPercent}%` }}
                    ></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span className="progress-text">
                      {c.completedLessons} / {c.totalLessons} bài học
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {c.progressPercent === 100 ? '✅ Đạt mục tiêu' : '⏱ Đang học'}
                    </span>
                  </div>

                  {c.progressPercent === 100 ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate('/certificates')}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, fontWeight: 600, background: '#10b981', borderColor: '#10b981' }}
                      >
                        📜 Chứng chỉ
                      </button>
                      <button
                        onClick={() => navigate(`/courses/${c.courseId}/learn`)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontWeight: 500 }}
                        title="Xem lại nội dung bài học"
                      >
                        Ôn lại 🔄
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/courses/${c.courseId}/learn`)}
                      className="btn btn-primary btn-sm btn-full"
                      style={{ fontWeight: 600 }}
                    >
                      Tiếp tục học ▶
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── 5. Recommended / Explore Courses (LMS Reality) ─────────── */}
      {recommendedCourses.length > 0 && (
        <section style={{ marginBottom: '38px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 className="section-title" style={{ margin: '0 0 4px' }}>Khám phá thêm khóa học gợi ý</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Các khóa học nổi bật giúp bạn mở rộng kiến thức và tích lũy chứng chỉ mới
              </p>
            </div>
            <Link to="/courses" className="btn btn-secondary btn-sm">
              Xem tất cả &rarr;
            </Link>
          </div>

          <div className="course-grid">
            {recommendedCourses.map((c) => (
              <div key={c._id || c.courseId} className="course-card">
                <div className="course-thumb">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt={c.title} />
                  ) : (
                    <span>💡</span>
                  )}
                </div>
                <div className="course-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-active" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
                      {c.category || 'Công nghệ'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
                      {c.level || 'Tất cả cấp độ'}
                    </span>
                  </div>

                  <h3 className="course-title" style={{ minHeight: '44px' }}>{c.title}</h3>
                  <p className="course-desc" style={{ minHeight: '38px' }}>
                    {c.description || 'Nâng tầm kỹ năng với nội dung bài giảng chuyên sâu và thực hành thực tế.'}
                  </p>

                  <div className="course-meta">
                    <span>⏱ {c.durationHours ? `${c.durationHours} giờ học` : 'Tự học'}</span>
                    <span>•</span>
                    <span>📖 {c.totalLessons || 'Nhiều'} bài giảng</span>
                  </div>

                  <button
                    onClick={() => handleEnroll(c.id || c._id || c.courseId)}
                    disabled={enrollingId === (c.id || c._id || c.courseId)}
                    className="btn btn-secondary btn-sm btn-full"
                    style={{ borderColor: 'var(--purple)', color: 'var(--purple)', fontWeight: 600 }}
                  >
                    {enrollingId === (c.id || c._id || c.courseId) ? 'Đang đăng ký...' : '+ Đăng ký học ngay'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── 6. Recent Learning Timeline (NOT an Admin Table!) ──────── */}
      {recent.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 className="section-title" style={{ margin: '0 0 4px' }}>Nhật ký hoạt động gần đây</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Các bài học bạn vừa tương tác gần đây
              </p>
            </div>
            <Link to="/history" className="btn btn-secondary btn-sm">
              Xem toàn bộ lịch sử &rarr;
            </Link>
          </div>

          <div className="timeline-list">
            {recent.map((item, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-left">
                  <div className="timeline-icon-box">
                    <span>📖</span>
                  </div>
                  <div>
                    <div className="timeline-course">{item.courseTitle}</div>
                    <div className="timeline-lesson">{item.lessonTitle}</div>
                  </div>
                </div>

                <div className="timeline-right">
                  <span className={`badge badge-${item.status}`}>
                    {item.status === 'completed' ? 'Đã hoàn thành' : 'Đang học'}
                  </span>
                  <div className="timeline-time">
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : 'Gần đây'}
                  </div>
                  {item.courseId && (
                    <button
                      onClick={() => navigate(`/courses/${item.courseId}/learn`)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Học tiếp &rarr;
                    </button>
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
