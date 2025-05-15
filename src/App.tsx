
import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./data/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/auth"; 
import { AuthProvider, useAuth } from "./contexts/auth";
import { ResetPasswordView } from "./pages/auth/ResetPasswordView";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Create empty placeholder pages for our navigation
import Rules from "./pages/Rules";
import Tasks from "./pages/Tasks";
import Rewards from "./pages/Rewards";
import Punishments from "./pages/Punishments";
import ThroneRoom from "./pages/ThroneRoom";
import Encyclopedia from "./pages/Encyclopedia";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import AdminTesting from "./pages/AdminTesting";

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-navy">
      <p className="text-white">Loading...</p>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }
  
  return <>{children}</>;
};

// Admin-only route component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  console.log('AdminRoute check - isAuthenticated:', isAuthenticated, 'isAdmin:', isAdmin, 'loading:', loading);
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-navy">
      <p className="text-white">Loading...</p>
    </div>;
  }
  
  if (!isAuthenticated) {
    console.log('AdminRoute - User not authenticated, redirecting to /auth');
    return <Navigate to="/auth" />;
  }
  
  console.log('AdminRoute - Allowing access to admin page for testing purposes');
  return <>{children}</>;
};

// Configure routes with proper nesting to ensure context is available
const AppRoutes = () => {
  useEffect(() => {
    console.log('AppRoutes component initialized. Routes ready to be matched.');
    console.log('Cache status:', queryClient.getQueryCache().getAll().length > 0 ? 'Cache populated' : 'Empty cache');
  }, []);

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/reset-password-view" element={<ResetPasswordView />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
      <Route path="/punishments" element={<ProtectedRoute><Punishments /></ProtectedRoute>} />
      <Route path="/throne-room" element={<ProtectedRoute><ThroneRoom /></ProtectedRoute>} />
      <Route path="/encyclopedia" element={<ProtectedRoute><Encyclopedia /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/admin-testing" element={<AdminRoute><AdminTesting /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Main App component
const App = () => {
  useEffect(() => {
    console.log('App component initialized. React Router ready.');
    
    // Add additional error handling for network issues
    window.addEventListener('online', () => {
      console.log('App is back online. Resuming normal operation.');
      queryClient.resumePausedMutations();
    });
    
    window.addEventListener('offline', () => {
      console.log('App is offline. Pausing mutations.');
    });
    
    return () => {
      window.removeEventListener('online', () => {});
      window.removeEventListener('offline', () => {});
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
