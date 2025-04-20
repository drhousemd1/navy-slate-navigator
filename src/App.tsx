import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  
  // IMPORTANT: For testing purposes, temporarily allow all authenticated users to access admin pages
  // This allows us to test the admin testing page without requiring admin privileges
  console.log('AdminRoute - Allowing access to admin page for testing purposes');
  return <>{children}</>;
  
  /* Uncomment this when you want to restore proper admin checking
  if (!isAdmin) {
    console.log('AdminRoute - User not admin, redirecting to /');
    return <Navigate to="/" />;
  }
  
  console.log('AdminRoute - User is admin, showing protected content');
  return <>{children}</>;
  */
};

// Global loading guard route for all protected routes
const GlobalAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-navy">
      <p className="text-white">Loading...</p>
    </div>;
  }
  
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
  // Add debugging for routing using standard React hooks
  React.useEffect(() => {
    console.log('AppRoutes component initialized. Routes ready to be matched.');
  }, []);

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/reset-password-view" element={<ResetPasswordView />} />

      {/* Wrap all authenticated routes in global guard */}
      <Route element={<ProtectedRoute />}>
        <Route element={<GlobalAuthGuard />}>
          <Route path="/" element={<Index />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/punishments" element={<Punishments />} />
          <Route path="/throne-room" element={<ThroneRoom />} />
          <Route path="/encyclopedia" element={<Encyclopedia />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/admin-testing" element={<AdminRoute><AdminTesting /></AdminRoute>} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Main App component
const App = () => {
  // Use proper React hooks inside the component function
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
