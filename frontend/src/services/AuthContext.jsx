import { createContext, useContext, useState } from 'react';
import { getToken, getUser, saveSession, clearSession, authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());
  const [token, setToken] = useState(() => getToken());
  const isAuthenticated = Boolean(token && user);

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
    try { await authService.logout(); } catch {}
    clearSession();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
