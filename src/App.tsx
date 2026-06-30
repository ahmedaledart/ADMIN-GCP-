/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Prices from './pages/Prices';
import PriceHistory from './pages/PriceHistory';
import News from './pages/News';
import Analysis from './pages/Analysis';
import Messages from './pages/Messages';
import Visits from './pages/Visits';
import Settings from './pages/Settings';
import Admins from './pages/Admins';

function ProtectedRoute({ 
  children, 
  requiredPermission 
}: { 
  children: ReactNode, 
  requiredPermission?: keyof ReturnType<typeof useAuthStore.getState>['adminUser']
}) {
  const { session, adminUser, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
    </div>;
  }

  if (!session || !adminUser) {
    return <Navigate to="/login" replace />;
  }

  // Check specific permission if required, super_admin is allowed unconditionally
  if (requiredPermission && adminUser.role !== 'super_admin' && !adminUser[requiredPermission as keyof typeof adminUser]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  const { checkAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/prices" element={
          <ProtectedRoute requiredPermission="can_manage_prices">
            <Prices />
          </ProtectedRoute>
        } />
        
        <Route path="/history" element={
          <ProtectedRoute requiredPermission="can_manage_prices">
            <PriceHistory />
          </ProtectedRoute>
        } />
        
        <Route path="/news" element={
          <ProtectedRoute requiredPermission="can_manage_news">
            <News />
          </ProtectedRoute>
        } />
        
        <Route path="/analysis" element={
          <ProtectedRoute requiredPermission="can_manage_analysis">
            <Analysis />
          </ProtectedRoute>
        } />
        
        <Route path="/messages" element={
          <ProtectedRoute requiredPermission="can_manage_messages">
            <Messages />
          </ProtectedRoute>
        } />
        
        <Route path="/visits" element={
          <ProtectedRoute requiredPermission="can_view_visits">
            <Visits />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute requiredPermission="can_manage_settings">
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/admins" element={
          <ProtectedRoute requiredPermission="can_manage_admins">
            <Admins />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}
