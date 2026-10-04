import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const confirmationResolvers = useRef(new Map());

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    const resolve = confirmationResolvers.current.get(id);
    if (resolve) {
      resolve(false);
      confirmationResolvers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const resolveConfirmation = useCallback((id, confirmed) => {
    const resolve = confirmationResolvers.current.get(id);
    if (resolve) {
      resolve(confirmed);
      confirmationResolvers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirmToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, {
      id,
      message,
      type: options.type || 'info',
      confirmation: true,
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
    }]);
    return new Promise((resolve) => {
      confirmationResolvers.current.set(id, resolve);
    });
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, confirmToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}${toast.confirmation ? ' confirmation' : ''}`} role={toast.confirmation ? 'alertdialog' : 'status'} aria-modal={toast.confirmation || undefined}>
            <span className="toast-message">{toast.message}</span>
            {toast.confirmation ? <div className="toast-actions">
              <button className="ghost compact" type="button" onClick={() => resolveConfirmation(toast.id, false)}>{toast.cancelLabel}</button>
              <button className={toast.type === 'error' ? 'danger-button compact' : 'primary compact'} type="button" onClick={() => resolveConfirmation(toast.id, true)}>{toast.confirmLabel}</button>
            </div> : <button className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Close notification">
              &times;
            </button>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
