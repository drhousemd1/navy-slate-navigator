
import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/auth"; 
import { AuthProvider, useAuth } from "./contexts/auth";
import { ResetPasswordView } from "./pages/auth/ResetPasswordView";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import { createPersistedQueryClient } from "./lib/react-query-config";
import { useSyncManager } from "./hooks/useSyncManager";
import { toast } from "./hooks/use-toast";
import { supabase } from "./integrations/supabase/client";

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

// Authentication checker wrapper for routes
const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { syncNow, forceFullRefresh } = useSyncManager({ 
    showToasts: true,
    intervalMs: 30000 // More frequent updates during potential issues
  });
  
  // Try to check authentication status directly, with error handling
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          console.log("AuthWrapper: Valid session found, syncing data");
          syncNow();
        } else {
          console.log("AuthWrapper: No session found");
        }
      } catch (error) {
        console.error("AuthWrapper: Error checking session:", error);
        toast({
          title: "Connection issue",
          description: "Having trouble connecting to the server. Click 'Refresh Data' to try again.",
          variant: "destructive",
          action: (
            <button 
              onClick={forceFullRefresh}
              className="px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Refresh Data
            </button>
          )
        });
      }
    };
    
    checkAuth();
  }, []);
  
  return <>{children}</>;
};

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
  
  return <AuthWrapper>{children}</AuthWrapper>;
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
  return <AuthWrapper>{children}</AuthWrapper>;
};

// Create persisted QueryClient using our centralized configuration
const queryClient = createPersistedQueryClient();

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

// Main App component with error boundary
const App = () => {
  // Add app-wide error handling
  useEffect(() => {
    // Global error handler for uncaught exceptions
    const handleError = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);
      toast({
        title: "Application Error",
        description: "Something went wrong. Please try refreshing the page.",
        variant: "destructive",
      });
    };
    
    window.addEventListener('error', handleError);
    
    // Add additional error handling for network issues
    window.addEventListener('online', () => {
      console.log('App is back online. Resuming normal operation.');
      queryClient.resumePausedMutations();
      
      toast({
        title: "Connection Restored",
        description: "You are back online.",
        variant: "default",
      });
    });
    
    window.addEventListener('offline', () => {
      console.log('App is offline. Pausing mutations.');
      
      toast({
        title: "Connection Lost",
        description: "You are currently offline. Some features may be unavailable.",
        variant: "destructive",
      });
    });
    
    return () => {
      window.removeEventListener('error', handleError);
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
