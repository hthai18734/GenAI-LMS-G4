import { useState } from 'react';

export default function PasswordInput({ disabled, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-input">
      <input {...props} disabled={disabled} type={visible ? 'text' : 'password'} />
      <button
        className="password-toggle"
        type="button"
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((value) => !value)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </span>
  );
}
