const API_BASE = '';
const ACCESS_KEY = 'ai_lms_access_token';
const USER_KEY = 'ai_lms_user';
const REFRESH_KEY = 'ai_lms_refresh_token';
let refreshRequest = null;

export const getToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
export function saveSession(data) {
  if (data.accessToken) localStorage.setItem(ACCESS_KEY, data.accessToken);
  if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  window.dispatchEvent(new Event('ai-lms-session'));
}
export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('ai-lms-session'));
}

export async function refreshSession() {
  if (!refreshRequest) {
    const refreshToken = getRefreshToken();
    refreshRequest = (async () => {
      const res = await fetch(`${API_BASE}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if ([401, 403].includes(res.status) && getRefreshToken() === refreshToken) clearSession();
        const error = new Error(body.message || 'Session expired.');
        error.status = res.status;
        throw error;
      }
      if (getRefreshToken() !== refreshToken) throw new Error('Session changed. Please sign in again.');
      saveSession(body.data);
      return body;
    })().finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}

export async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const sessionUser = getUser();
  const sessionUserId = sessionUser?.id || sessionUser?._id;
  let res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  let body = await res.json().catch(() => ({}));
  const protectedRequest = !url.includes('/auth/') || url.includes('/change-password');
  const currentUser = getUser();
  const sameUser = sessionUserId === (currentUser?.id || currentUser?._id);
  if (res.status === 401 && token && protectedRequest && getRefreshToken() && sameUser) {
    if (getToken() === token) await refreshSession();
    headers.Authorization = `Bearer ${getToken()}`;
    res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    body = await res.json().catch(() => ({}));
  }
  const sameSession = headers.Authorization ? headers.Authorization === `Bearer ${getToken()}` : !getToken();
  if (sameSession && ((res.status === 401 && protectedRequest)
    || (res.status === 403 && body.message === 'Your account has been deactivated.'))) {
    clearSession();
    if (!['/login', '/register', '/verify-otp', '/request-password-reset', '/reset-password'].includes(window.location.pathname)) {
      window.location.replace('/login');
    }
  }
  if (!res.ok) {
    const error = new Error(body.message || 'Request failed.');
    error.errors = body.errors || null;
    error.status = res.status;
    throw error;
  }
  return body;
}

export async function authenticatedBlob(url) {
  const protectedUrl = url.startsWith('/uploads/lesson-videos/')
    ? url.replace('/uploads/lesson-videos/', '/api/media/lesson-videos/')
    : url;
  let token = getToken();
  const request = () => fetch(`${API_BASE}${protectedUrl}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let res = await request();
  if (res.status === 401 && token && getRefreshToken()) {
    await refreshSession();
    token = getToken();
    res = await request();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.message || 'Unable to load protected media.');
    error.status = res.status;
    throw error;
  }
  return res.blob();
}
