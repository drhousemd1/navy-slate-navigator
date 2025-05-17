
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
import AppGuide from './pages/AppGuide';
import LoginSignupView from './pages/auth/LoginSignupView';
import ForgotPasswordView from './pages/auth/ForgotPasswordView';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import NotFound from './pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/rules" element={<Rules />} />
      <Route path="/punishments" element={<Punishments />} />
      <Route path="/throne-room" element={<ThroneRoom />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/encyclopedia" element={<Encyclopedia />} />
      <Route path="/app-guide" element={<AppGuide />} />
      <Route path="/auth" element={<LoginSignupView />} />
      <Route path="/forgot-password" element={<ForgotPasswordView />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
