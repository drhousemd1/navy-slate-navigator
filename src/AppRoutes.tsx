
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Rewards from './pages/Rewards';
import Tasks from './pages/Tasks';
import Rules from './pages/Rules';
import Punishments from './pages/Punishments';
import ThroneRoom from './pages/ThroneRoom';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Encyclopedia from './pages/Encyclopedia';
import Wellbeing from './pages/Wellbeing';
import ColorScheme from './pages/ColorScheme';
import Notifications from './pages/Notifications';
import LogoUpload from './pages/LogoUpload';
import Auth from './pages/auth';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import NotFound from './pages/NotFound';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<ErrorBoundary><Auth /></ErrorBoundary>} />
      <Route path="/forgot-password" element={<ErrorBoundary><Auth /></ErrorBoundary>} /> 
      <Route path="/reset-password" element={<ErrorBoundary><ResetPasswordPage /></ErrorBoundary>} />
      
      {/* Protected routes */}
      <Route 
        path="/" 
        element={<ProtectedRoute><ErrorBoundary><Index /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/rewards" 
        element={<ProtectedRoute><ErrorBoundary><Rewards /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/tasks" 
        element={<ProtectedRoute><ErrorBoundary><Tasks /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/rules" 
        element={<ProtectedRoute><ErrorBoundary><Rules /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/punishments" 
        element={<ProtectedRoute><ErrorBoundary><Punishments /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/throne-room" 
        element={<ProtectedRoute><ErrorBoundary><ThroneRoom /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/profile" 
        element={<ProtectedRoute><ErrorBoundary><Profile /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/messages" 
        element={<ProtectedRoute><ErrorBoundary><Messages /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/encyclopedia" 
        element={<ProtectedRoute><ErrorBoundary><Encyclopedia /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/wellbeing" 
        element={<ProtectedRoute><ErrorBoundary><Wellbeing /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/profile/color-scheme" 
        element={<ProtectedRoute><ErrorBoundary><ColorScheme /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/profile/notifications" 
        element={<ProtectedRoute><ErrorBoundary><Notifications /></ErrorBoundary></ProtectedRoute>} 
      />
      <Route 
        path="/logo-upload" 
        element={<ProtectedRoute><ErrorBoundary><LogoUpload /></ErrorBoundary></ProtectedRoute>} 
      />
      
      {/* Catch-all for not found routes */}
      <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
    </Routes>
  );
};

export default AppRoutes;
