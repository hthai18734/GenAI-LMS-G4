import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicService } from '../services/api';
import { useAuth } from '../services/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Metadata state
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Integrated Courses state
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all'); // 'all', 'free', 'paid'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'rating', 'price_asc', 'price_desc'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });

  // 1. Initial metadata loading
  useEffect(() => {
    publicService.getHomepage()
      .then((res) => {
        if (res.data) {
          if (res.data.categories) setCategories(res.data.categories);
          if (res.data.teachers) setTeachers(res.data.teachers);
        }
      })
      .catch((err) => console.error('Failed to load metadata:', err));
  }, []);

  // 2. Query courses whenever search, category, price, sort or page changes
  useEffect(() => {
    async function fetchCourses() {
      setLoadingCourses(true);
      try {
        let res;
        if (activeKeyword.trim()) {
          // Search courses
          res = await publicService.searchCourses(activeKeyword.trim(), page, 9);
        } else if (selectedCategory !== 'all' || selectedPrice !== 'all' || sortBy !== 'newest') {
          // Filter & Sort courses
          const minPrice = selectedPrice === 'paid' ? 1 : undefined;
          const maxPrice = selectedPrice === 'free' ? 0 : undefined;
          res = await publicService.filterAndSortCourses({
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            minPrice,
            maxPrice,
            sortBy,
            page,
            limit: 9,
          });
        } else {
          // Browse all courses
          res = await publicService.browseCourses(page, 9);
        }

        if (res && res.data) {
          setCourses(res.data.courses || res.data.items || []);
          setPagination(res.data.pagination || { page, limit: 9, total: 0, totalPages: 1 });
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setCourses([]);
        setPagination({ page, limit: 9, total: 0, totalPages: 1 });
      } finally {
        setLoadingCourses(false);
      }
    }

    fetchCourses();
  }, [activeKeyword, selectedCategory, selectedPrice, sortBy, page]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveKeyword(keyword);
  };

  const handleClearSearch = () => {
    setKeyword('');
    setActiveKeyword('');
    setPage(1);
  };

  const handleCategorySelect = (catName) => {
    setSelectedCategory((prev) => (prev === catName ? 'all' : catName));
    setActiveKeyword('');
    setKeyword('');
    setPage(1);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'inherit' }}>
      
      {/* ─── HEADER / TOP BAR ─── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 36px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '17px'
          }}>
            ✦
          </div>
          <div>
            <span style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>AI-LMS</span>
            <span style={{ fontSize: '11px', display: 'block', color: '#64748b', marginTop: '-2px' }}>Learning Platform</span>
          </div>
        </Link>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {user?.role === 'admin' && (
            <Link
              to="/admin/dashboard"
              style={{
                textDecoration: 'none',
                color: '#4338ca',
                background: '#eef2ff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                border: '1px solid #c7d2fe',
              }}
            >
              📊 Bảng điều khiển Admin
            </Link>
          )}

          {isAuthenticated ? (
            <Link
              to={user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'teacher' ? '/teacher/courses' : '/dashboard'}
              style={{
                textDecoration: 'none',
                background: '#4f46e5',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              {user?.role === 'admin' ? 'Bảng quản trị Admin →' : user?.role === 'teacher' ? 'Quản lý khóa học →' : `My Dashboard (${user?.fullName || 'Student'}) →`}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  textDecoration: 'none',
                  color: '#475569',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '8px 12px'
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  textDecoration: 'none',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '9px 18px',
                  borderRadius: '8px'
                }}
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
        borderBottom: '1px solid #e2e8f0',
        padding: '60px 24px 48px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: '#e0e7ff',
            color: '#4338ca',
            padding: '5px 14px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            Next-Gen EdTech Platform
          </div>

          <h1 style={{
            fontSize: '44px',
            fontWeight: '900',
            lineHeight: 1.18,
            color: '#0f172a',
            margin: '0 0 16px',
            letterSpacing: '-1px'
          }}>
            Intelligent Learning, Powered by AI
          </h1>

          <p style={{
            fontSize: '16px',
            lineHeight: 1.6,
            color: '#64748b',
            margin: '0 0 32px'
          }}>
            Discover expert-led courses, search interactive topics, and accelerate your career with modern curriculum.
          </p>

          {/* 🔍 SEARCH BOX */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex',
              maxWidth: '620px',
              margin: '0 auto 24px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '6px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              border: '2px solid #e2e8f0',
            }}
          >
            <input
              type="text"
              placeholder="Search courses by title, topic, or keyword..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                padding: '12px 16px',
                fontSize: '15px',
                outline: 'none',
                color: '#0f172a',
              }}
            />
            {activeKeyword && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '0 12px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>

          {/* Value props */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', fontSize: '13px', color: '#64748b' }}>
            <div><b style={{ color: '#0f172a' }}>100%</b> Verified Curriculum</div>
            <div><b style={{ color: '#0f172a' }}>Top-Rated</b> Instructors</div>
            <div><b style={{ color: '#0f172a' }}>Free & Paid</b> Courses Available</div>
          </div>
        </div>
      </section>

      {/* ─── CURRICULUM TOPICS (NO ICONS / PURE CLEAN PILLS) ─── */}
      <section style={{ maxWidth: '1240px', margin: '36px auto 0', padding: '0 24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Curriculum Topics
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
            Select a topic to filter available courses
          </p>
        </div>

        {/* Clean Topic Pills without icons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => handleCategorySelect('all')}
            style={{
              background: selectedCategory === 'all' && !activeKeyword ? '#4f46e5' : '#ffffff',
              color: selectedCategory === 'all' && !activeKeyword ? '#ffffff' : '#334155',
              border: '1px solid',
              borderColor: selectedCategory === 'all' && !activeKeyword ? '#4f46e5' : '#cbd5e1',
              padding: '7px 16px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: selectedCategory === 'all' && !activeKeyword ? '700' : '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Topics
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat._id}
                onClick={() => handleCategorySelect(cat.name)}
                style={{
                  background: isSelected ? '#4f46e5' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  border: '1px solid',
                  borderColor: isSelected ? '#4f46e5' : '#cbd5e1',
                  padding: '7px 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── COURSE CATALOG: BROWSE, SEARCH, FILTER & SORT ─── */}
      <section style={{ maxWidth: '1240px', margin: '36px auto 60px', padding: '0 24px' }}>
        
        {/* Controls Bar */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          {/* Active summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              Courses ({pagination.total !== undefined ? pagination.total : courses.length})
            </span>

            {activeKeyword && (
              <span style={{
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                Query: "{activeKeyword}"
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span style={{
                background: '#f1f5f9',
                color: '#334155',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                Topic: {selectedCategory}
              </span>
            )}
          </div>

          {/* Price & Sort Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            
            {/* Price Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Price:</span>
              <button
                onClick={() => { setSelectedPrice('all'); setPage(1); }}
                style={{
                  background: selectedPrice === 'all' ? '#0f172a' : '#f8fafc',
                  color: selectedPrice === 'all' ? '#ffffff' : '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              <button
                onClick={() => { setSelectedPrice('free'); setPage(1); }}
                style={{
                  background: selectedPrice === 'free' ? '#10b981' : '#f8fafc',
                  color: selectedPrice === 'free' ? '#ffffff' : '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Free
              </button>
              <button
                onClick={() => { setSelectedPrice('paid'); setPage(1); }}
                style={{
                  background: selectedPrice === 'paid' ? '#4f46e5' : '#f8fafc',
                  color: selectedPrice === 'paid' ? '#ffffff' : '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Paid
              </button>
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '13px',
                  color: '#334155',
                  background: '#ffffff',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="newest">Newest</option>
                <option value="rating">Highest Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

          </div>
        </div>

        {/* Course Grid */}
        {loadingCourses ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Loading courses catalog...
          </div>
        ) : courses.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            padding: '48px 20px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>
              No courses found matching your criteria
            </h3>
            <p style={{ fontSize: '13px', margin: '0 0 16px' }}>
              Try searching with different keywords or clear existing filters.
            </p>
            <button
              onClick={() => { handleClearSearch(); setSelectedCategory('all'); setSelectedPrice('all'); }}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}>
            {courses.map((course) => {
              const instructor = course.instructorId || course.teacherId;
              const instructorName = instructor?.fullName || 'Senior Instructor';
              const teacherId = instructor?._id;

              return (
                <div
                  key={course._id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', height: '175px', background: '#0f172a', overflow: 'hidden' }}>
                    <img
                      src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80'}
                      alt={course.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {course.category && (
                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {course.category}
                      </span>
                    )}
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(79, 70, 229, 0.9)',
                      color: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      ★ {course.averageRating ? course.averageRating.toFixed(1) : '4.9'}
                    </span>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#0f172a',
                      margin: '0 0 8px',
                      lineHeight: 1.4,
                      minHeight: '44px'
                    }}>
                      <Link to={`/courses/${course._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {course.title}
                      </Link>
                    </h3>

                    {/* Teacher link */}
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                      Instructor:{' '}
                      {teacherId ? (
                        <Link
                          to={`/teachers/${teacherId}`}
                          style={{ color: '#4f46e5', fontWeight: '600', textDecoration: 'none' }}
                          title="View instructor profile"
                        >
                          {instructorName} ↗
                        </Link>
                      ) : (
                        <span style={{ color: '#334155', fontWeight: '600' }}>{instructorName}</span>
                      )}
                    </div>

                    <div style={{
                      marginTop: 'auto',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '14px'
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: course.price > 0 ? '#0f172a' : '#10b981' }}>
                        {course.price > 0 ? `$${course.price}` : 'Free'}
                      </div>

                      <Link
                        to={`/courses/${course._id}`}
                        style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '13px',
                          textDecoration: 'none'
                        }}
                      >
                        View Course →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '36px'
          }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                background: page <= 1 ? '#f1f5f9' : '#ffffff',
                color: page <= 1 ? '#94a3b8' : '#334155',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>

            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
              Page {page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              style={{
                background: page >= pagination.totalPages ? '#f1f5f9' : '#ffffff',
                color: page >= pagination.totalPages ? '#94a3b8' : '#334155',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </section>

      {/* ─── WORLD-CLASS EDUCATORS ─── */}
      <section style={{
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '60px 24px',
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
              World-Class Educators
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Learn from verified industry professionals and specialized educators.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {teachers.map((tea) => (
              <div
                key={tea._id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <img
                  src={tea.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={tea.fullName}
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginBottom: '14px',
                    border: '3px solid #e0e7ff'
                  }}
                />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>
                  {tea.fullName}
                </h3>
                <div style={{ fontSize: '12px', color: '#4f46e5', fontWeight: '600', marginBottom: '12px' }}>
                  {tea.email}
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 18px', minHeight: '38px' }}>
                  {tea.bio || 'Verified curriculum specialist and instructor on AI-LMS.'}
                </p>
                <Link
                  to={`/teachers/${tea._id}`}
                  style={{
                    background: '#ffffff',
                    color: '#334155',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  View Profile & Courses →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '36px 32px 24px',
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '13px',
          color: '#64748b'
        }}>
          <div>
            <b style={{ color: '#0f172a' }}>AI-LMS Platform</b> · Next-Generation Learning Management System
          </div>
          <div>
            © 2026 AI-LMS. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
