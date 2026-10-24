import { useEffect, useState } from 'react';
import {
  authService,
  clearSession,
  getRefreshToken,
  getToken,
  getUser,
  saveSession,
} from './api.js';
import AuthContext from './authContext.js';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());
  const [token, setToken] = useState(() => getToken());
  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    const sync = () => { setToken(getToken()); setUser(getUser()); };
    window.addEventListener('ai-lms-session', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ai-lms-session', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function login(data) {
    saveSession(data);
    setToken(data.accessToken);
    setUser(data.user);
  }

  function updateUser(userData) {
    localStorage.setItem('ai_lms_user', JSON.stringify(userData));
    setUser(userData);
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    clearSession();
    setToken(null);
    setUser(null);
    try { await authService.logout(refreshToken); } catch { /* local logout still succeeds */ }
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
