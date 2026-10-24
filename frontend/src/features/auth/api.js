import { api, clearSession, getRefreshToken, getToken, getUser, refreshSession, saveSession } from '../../shared/api/client.js';

export { clearSession, getRefreshToken, getToken, getUser, saveSession };
export const authService = {
  login: (email, password) => api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => api('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (data) => api('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  resendOtp: (data) => api('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),
  getGoogleUrl: () => api(`/api/auth/google?origin=${encodeURIComponent(window.location.origin)}`),
  exchangeGoogleCode: (code) => api('/api/auth/google/exchange', { method: 'POST', body: JSON.stringify({ code }) }),
  logout: (refreshToken = getRefreshToken()) => api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  requestPasswordReset: (email) => api('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) => api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data) => api('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  refreshToken: refreshSession,
};
