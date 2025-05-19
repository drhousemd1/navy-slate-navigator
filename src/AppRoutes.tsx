
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
// import AppGuide from './pages/AppGuide'; // Removed AppGuide import
import Auth from './pages/auth'; // Import the main Auth component
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import NotFound from './pages/NotFound';
import ErrorBoundary from '@/components/ErrorBoundary';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<ErrorBoundary><Index /></ErrorBoundary>} />
      <Route path="/rewards" element={<ErrorBoundary><Rewards /></ErrorBoundary>} />
      <Route path="/tasks" element={<ErrorBoundary><Tasks /></ErrorBoundary>} />
      <Route path="/rules" element={<ErrorBoundary><Rules /></ErrorBoundary>} />
      <Route path="/punishments" element={<ErrorBoundary><Punishments /></ErrorBoundary>} />
      <Route path="/throne-room" element={<ErrorBoundary><ThroneRoom /></ErrorBoundary>} />
      <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
      <Route path="/messages" element={<ErrorBoundary><Messages /></ErrorBoundary>} />
      <Route path="/encyclopedia" element={<ErrorBoundary><Encyclopedia /></ErrorBoundary>} />
      {/* <Route path="/app-guide" element={<ErrorBoundary><AppGuide /></ErrorBoundary>} /> // Removed AppGuide route */}
      
      {/* Auth routes now use the main Auth component */}
      <Route path="/auth" element={<ErrorBoundary><Auth /></ErrorBoundary>} />
      <Route path="/forgot-password" element={<ErrorBoundary><Auth /></ErrorBoundary>} /> 
      
      <Route path="/reset-password" element={<ErrorBoundary><ResetPasswordPage /></ErrorBoundary>} />
      <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
    </Routes>
  );
};

export default AppRoutes;
