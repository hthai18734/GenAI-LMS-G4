import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicService } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../components/Toast';

export default function PublicCoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const keyword = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedSort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(keyword);

  useEffect(() => {
    publicService
      .getCategories()
      .then((res) => setCategories(res.data?.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      try {
        let res;
        if (keyword.trim()) {
          res = await publicService.searchCourses(keyword.trim(), currentPage, 12);
        } else if (selectedCategory || minPrice || maxPrice || selectedSort !== 'newest') {
          res = await publicService.filterAndSortCourses({
            category: selectedCategory,
            minPrice,
            maxPrice,
            sortBy: selectedSort,
            page: currentPage,
            limit: 12,
          });
        } else {
          res = await publicService.browseCourses(currentPage, 12);
        }

        if (res.data) {
          setCourses(res.data.courses || res.data.items || []);
          setPagination(
            res.data.pagination || { page: currentPage, limit: 12, total: 0, totalPages: 1 },
          );
        }
      } catch (err) {
        addToast(err.message || 'Failed to fetch courses', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [keyword, selectedCategory, selectedSort, minPrice, maxPrice, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleCategorySelect = (catName) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedCategory === catName) {
      newParams.delete('category');
    } else {
      newParams.set('category', catName);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSortChange = (e) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', e.target.value);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(newPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <header
        className="landing-bar"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}
      >
        <Link to="/" className="brand compact" style={{ textDecoration: 'none' }}>
          <div className="brand-logo">
            <img src="/assets/images/logo.jpg" alt="AI-LMS" />
          </div>
          <div className="brand-name">AI-LMS</div>
        </Link>
        <nav className="landing-nav">
          <Link to="/" style={{ color: 'var(--text-dim)' }}>
            Home
          </Link>
          <Link to="/explore" style={{ fontWeight: 600 }}>
            Explore Courses
          </Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ padding: '6px 14px' }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register" className="primary">
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 20px' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px' }}>
            Explore Our Learning Catalog
          </h1>
          <p
            style={{
              color: 'var(--text-dim)',
              fontSize: '16px',
              maxWidth: '600px',
              margin: '0 auto 24px',
            }}
          >
            Browse through hundreds of high quality courses with integrated AI learning assistance.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex',
              maxWidth: '560px',
              margin: '0 auto',
              gap: '8px',
              background: 'var(--surface)',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid var(--line)',
            }}
          >
            <input
              type="text"
              placeholder="Search by course title, topic, or keyword..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                padding: '10px 16px',
                fontSize: '15px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>
              Search
            </button>
          </form>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
            padding: '16px 20px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-dim)',
                marginRight: '4px',
              }}
            >
              Categories:
            </span>
            <button
              onClick={() => handleCategorySelect('')}
              className={`badge ${!selectedCategory ? 'badge-primary' : ''}`}
              style={{
                cursor: 'pointer',
                border: 'none',
                background: !selectedCategory ? 'var(--primary)' : 'var(--bg)',
                color: !selectedCategory ? '#fff' : 'var(--text-dim)',
                padding: '6px 12px',
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => handleCategorySelect(cat.name)}
                className="badge"
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: selectedCategory === cat.name ? 'var(--primary)' : 'var(--bg)',
                  color: selectedCategory === cat.name ? '#fff' : 'var(--text-dim)',
                  padding: '6px 12px',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Sort by:</label>
            <select
              value={selectedSort}
              onChange={handleSortChange}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                color: 'var(--text)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            {(keyword || selectedCategory || selectedSort !== 'newest') && (
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="spinner"></div>
          </div>
        ) : courses.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              No matching courses found
            </h3>
            <p style={{ color: 'var(--text-dim)', maxWidth: '400px', margin: '0 auto 20px' }}>
              Try adjusting your search keyword or clearing the applied filters.
            </p>
            <button onClick={handleClearFilters} className="btn btn-primary">
              View All Courses
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px',
                marginBottom: '40px',
              }}
            >
              {courses.map((course) => (
                <Link
                  key={course._id}
                  to={`/courses/${course._id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid var(--line)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        height: '160px',
                        background: 'var(--bg-subtle)',
                        position: 'relative',
                      }}
                    >
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '36px',
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                            color: '#fff',
                          }}
                        >
                          📚
                        </div>
                      )}
                      {course.category && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            backdropFilter: 'blur(4px)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          {course.category}
                        </span>
                      )}
                    </div>

                    <div
                      style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}
                    >
                      <h4
                        style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          marginBottom: '8px',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {course.title}
                      </h4>

                      <p
                        style={{
                          color: 'var(--text-dim)',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          marginBottom: '16px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          flex: 1,
                        }}
                      >
                        {course.description ||
                          'Learn essential knowledge and practical skills with AI-LMS.'}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600' }}>
                          ★ {course.averageRating ? course.averageRating.toFixed(1) : '5.0'}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>
                          {course.price > 0 ? `$${course.price}` : 'Free'}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '40px',
                }}
              >
                <button
                  disabled={!pagination.hasPrevPage}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  ← Previous
                </button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    color: 'var(--text-dim)',
                    fontSize: '14px',
                  }}
                >
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
