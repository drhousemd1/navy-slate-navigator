import React, { lazy, Suspense } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './data/queryClient';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

// Lazy load pages
const Index = lazy(() => import('./pages/Index'));
// Correcting lazy import for default export if LoginSignupView is default exported
const AuthPage = lazy(() => import('./pages/auth').then(module => ({ default: module.default }))); 
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

// App content component - This will now render child routes
const AppContent: React.FC = () => {
  return (
    <>
      <Outlet />
    </>
  );
};

// Wrapper component for ForgotPasswordView route
const ForgotPasswordPageRoute: React.FC = () => {
  const navigate = useNavigate();
  return <ForgotPasswordView onBackClick={() => navigate('/auth', { state: { view: 'login' } })} />;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <TooltipProvider>
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background text-foreground">Loading...</div>}>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPageRoute />} />
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
    </QueryClientProvider>
  );
};

export default App;
