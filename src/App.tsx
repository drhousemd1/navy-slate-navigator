
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

// Lazy load pages
const Index = lazy(() => import('./pages/Index'));
const LoginSignupView = lazy(() => import('./pages/auth'));
const ForgotPasswordView = lazy(() => import('./pages/auth/ForgotPasswordView').then(module => ({ default: module.ForgotPasswordView })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Rules = lazy(() => import('./pages/Rules'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Punishments = lazy(() => import('./pages/Punishments'));
const ThroneRoom = lazy(() => import('./pages/ThroneRoom'));
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'));
const Profile = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-background text-foreground">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// App content component
const AppContent: React.FC = () => {
  return (
    <>
      <Index />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <TooltipProvider>
          <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background text-foreground">Loading...</div>}>
            <Routes>
              <Route path="/auth" element={<LoginSignupView />} />
              <Route path="/forgot-password" element={<ForgotPasswordView />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppContent />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Index />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="rules" element={<Rules />} />
                <Route path="rewards" element={<Rewards />} />
                <Route path="punishments" element={<Punishments />} />
                <Route path="throne-room" element={<ThroneRoom />} />
                <Route path="encyclopedia" element={<Encyclopedia />} />
                <Route path="profile" element={<Profile />} />
                <Route path="messages" element={<Messages />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
