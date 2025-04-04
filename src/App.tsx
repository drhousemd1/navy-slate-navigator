
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/auth"; 
import { AuthProvider } from "./contexts/AuthContext"; // Updated import path
import { useAuth } from "./contexts/AuthContext"; // Updated import path
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
  
  // Add debugging for admin route
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
  
  if (!isAdmin) {
    console.log('AdminRoute - User not admin, redirecting to /');
    return <Navigate to="/" />;
  }
  
  console.log('AdminRoute - User is admin, showing protected content');
  return <>{children}</>;
};

// Create a client with aggressive caching to maintain state between page navigations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// Configure routes with proper nesting to ensure context is available
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} /> {/* Add new route */}
      <Route path="/reset-password-view" element={<ResetPasswordView />} /> {/* Rename existing route */}
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
      <Route path="/punishments" element={<ProtectedRoute><Punishments /></ProtectedRoute>} />
      <Route path="/throne-room" element={<ThroneRoom />} />
      <Route path="/encyclopedia" element={<ProtectedRoute><Encyclopedia /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  // Add debugging for react-router to help troubleshoot
  React.useEffect(() => {
    console.log('App component initialized. React Router ready.');
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
