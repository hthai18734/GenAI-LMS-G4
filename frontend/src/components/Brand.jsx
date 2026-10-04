import React from 'react';
import { Link } from 'react-router-dom';

export default function Brand({ compact = false }) {
  return (
    <Link to="/" className={`brand ${compact ? 'compact' : ''}`} style={{ textDecoration: 'none' }}>
      <div className="brand-logo">
        <img src="/assets/images/logo.jpg" alt="AI-LMS" />
      </div>
      <div className="brand-name">AI-LMS</div>
    </Link>
  );
}
