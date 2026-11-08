import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth.js';
import './NotFoundPage.css';

function Icon({ name, ...props }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    home: <><path d="m3 10 9-7 9 7v10H3z" /><path d="M9 20v-7h6v7" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /><path d="M20 2v4m-2-2h4" /></>,
    book: <><path d="M12 5v16M3 3c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 3-3-3-5-4-9-3z" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    help: <><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01" /><circle cx="12" cy="12" r="9" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    sync: <><path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export default function NotFoundPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [year] = useState(() => new Date().getFullYear());
  const inputRef = useRef(null);
  const helpRef = useRef(null);
  const dashboard = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'teacher' ? '/teacher/dashboard' : '/dashboard';
  const portal = isAuthenticated ? dashboard : '/login';

  useEffect(() => {
    const previousTitle = document.title;
    document.title = '404 — Page Not Found | AI-LMS';
    return () => { document.title = previousTitle; };
  }, []);

  function search(event) {
    event.preventDefault();
    const text = query.trim();
    if (/^(student dashboard|dashboard)$/i.test(text)) navigate(portal);
    else if (/^(help center|help center & documentation)$/i.test(text)) helpRef.current.showModal();
    else navigate(!text || /^browse courses$/i.test(text) ? '/explore' : `/explore?q=${encodeURIComponent(text)}`);
  }

  const destinations = [
    { title: 'Courses Catalog', description: 'Explore courses across programming, technology, and more. Find your next learning opportunity.', action: 'Explore Catalog', icon: 'book', to: '/explore' },
    { title: 'Learning Command', description: 'Return to your dashboard, manage your courses, and continue your learning journey.', action: 'Open Dashboard', icon: 'dashboard', to: portal, accent: true },
    { title: 'Help Center', description: 'Find guidance on accessing courses, navigating your dashboard, and recovering your account.', action: 'Get Help', icon: 'help', help: true },
    { title: 'Your Account', description: 'Access your profile and keep your personal information and account details up to date.', action: isAuthenticated ? 'View Profile' : 'Sign In', icon: 'user', to: isAuthenticated ? '/profile' : '/login' },
  ];

  return (
    <div className="not-found-page">
      <header className="nf-header">
        <div className="nf-header-inner">
          <Link to="/" className="nf-brand"><img src="/assets/images/logo.jpg" alt="" /><span>AI-LMS</span></Link>
          <nav aria-label="Main navigation"><Link to="/">Home</Link><Link to="/explore">Catalog</Link><Link to={portal}>Dashboard</Link><button type="button" onClick={() => helpRef.current.showModal()}>Help</button></nav>
          <Link to={isAuthenticated ? '/profile' : '/login'} className="nf-account"><span>{isAuthenticated ? 'My Account' : 'Sign In'}</span><span className="nf-avatar"><Icon name="user" width="18" height="18" /></span></Link>
        </div>
      </header>
      <main>
        <section className="nf-hero" aria-labelledby="nf-title">
          <div className="nf-badge"><span className="nf-dot" />Let’s get you back on track<span className="nf-badge-brand">AI-LMS</span></div>
          <div className="nf-code" aria-hidden="true"><span>404</span><span className="nf-resource">Resource Miss</span></div>
          <h1 id="nf-title">404 — Page Not Found</h1>
          <p className="nf-description">The page or resource you are looking for does not exist, has been removed, or is temporarily unavailable.</p>
          <div className="nf-search-card">
            <div className="nf-search-heading"><Icon name="sparkle" /><h2>AI-LMS Navigator</h2><span>Find your next destination</span></div>
            <form className="nf-search-form" onSubmit={search} role="search">
              <Icon name="search" />
              <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} aria-label="Search courses or find a destination" placeholder="Search courses or find your dashboard..." type="search" />
              <button type="submit" className="nf-button nf-primary">Search<Icon name="arrow" width="16" height="16" /></button>
            </form>
            <div className="nf-suggestions"><span>Try searching:</span>{['Browse Courses', 'Student Dashboard', 'Help Center'].map(text => <button type="button" key={text} onClick={() => { setQuery(text); inputRef.current.focus(); }}>{text}</button>)}</div>
          </div>
          <div className="nf-actions">
            <Link to="/" className="nf-button nf-primary"><Icon name="home" />Back to Home</Link>
            <button type="button" className="nf-button nf-secondary" onClick={() => { if (window.history.state?.idx > 0) navigate(-1); else navigate('/', { replace: true }); }}><Icon name="back" />Go Back</button>
            <button type="button" className="nf-button nf-soft" onClick={() => helpRef.current.showModal()}><Icon name="help" />Help Center</button>
          </div>
        </section>
        <section className="nf-destinations" aria-labelledby="nf-destinations-title">
          <div className="nf-section-heading"><div><p>Navigation Recovery</p><h2 id="nf-destinations-title">Popular Destinations</h2></div><span><Icon name="sync" width="16" height="16" />Instant Directory</span></div>
          <div className="nf-grid">{destinations.map(item => {
            const content = <><span className="nf-card-icon"><Icon name={item.icon} width="22" height="22" /></span><h3>{item.title}</h3><p>{item.description}</p><span className="nf-card-action">{item.action}<Icon name="arrow" width="16" height="16" /></span></>;
            const className = `nf-card${item.accent ? ' nf-card-accent' : ''}`;
            return item.help ? <button type="button" className={className} key={item.title} onClick={() => helpRef.current.showModal()}>{content}</button> : <Link to={item.to} className={className} key={item.title}>{content}</Link>;
          })}</div>
          <div className="nf-support"><span className="nf-support-icon"><Icon name="help" width="28" height="28" /></span><div><h3>Still unable to find what you need?</h3><p>Check our navigation guide or explore the catalog to continue your learning journey.</p></div><div className="nf-support-actions"><button type="button" className="nf-button nf-white" onClick={() => helpRef.current.showModal()}>Navigation Guide</button><Link to="/explore" className="nf-button nf-primary">Browse Courses<Icon name="arrow" width="16" height="16" /></Link></div></div>
        </section>
      </main>
      <footer className="nf-footer">© {year} AI-LMS Platform. All rights reserved.</footer>
      <dialog ref={helpRef} className="nf-help-dialog" aria-labelledby="nf-help-title">
        <h2 id="nf-help-title">Find your way around AI-LMS</h2>
        <p>Browse the catalog to discover courses. Sign in to open your dashboard and access your enrolled courses.</p>
        <p>If a saved link no longer works, return to the catalog or your dashboard and open the resource from there.</p>
        <Link to="/request-password-reset">Forgot your password? Reset it here.</Link>
        <form method="dialog"><button className="nf-button nf-primary">Got it</button></form>
      </dialog>
    </div>
  );
}
