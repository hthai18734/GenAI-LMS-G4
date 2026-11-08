import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AuthProvider from './features/auth/AuthProvider';
import { ToastProvider } from './components/Toast';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
