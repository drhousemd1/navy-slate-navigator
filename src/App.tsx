import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./data/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/auth"; 
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ResetPasswordView } from "./pages/auth/ResetPasswordView";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Placeholder pages
import Rules from "./pages/Rules";
import Tasks from "./pages/Tasks";
import Rewards from "./pages/Rewards";
import Punishments from "./pages/Punishments";
import ThroneRoom from "./pages/ThroneRoom";
import Encyclopedia from "./pages/Encyclopedia";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import AppGuidePage from "./pages/AppGuide";

// New imports for persistence
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import { APP_CACHE_VERSION } from '@/lib/react-query-config';

// New imports for Network Status
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext';
import OfflineBanner from '@/components/OfflineBanner';

// Configure localforage instance if not already globally configured elsewhere
localforage.config({
  name: 'kingdom-app-cache', // A distinct name for this app's localforage store
  storeName: 'react_query_cache', // Store name for react-query data
  description: 'Persistent cache for Kingdom app React Query state',
});

// Use createAsyncStoragePersister with localforage
const localforagePersister = createAsyncStoragePersister({
  storage: localforage, // localforage is compatible with AsyncStorage interface
  key: 'REACT_QUERY_OFFLINE_CACHE', // Default key, can be customized
  throttleTime: 1000, // How often to persist, default is 1000ms
});

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-navy">
      <p className="text-white">Loading authentication...</p>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }
  
  return <>{children}</>;
};


// AppRoutes component
const AppRoutes = () => {
  useEffect(() => {
    console.log('AppRoutes component initialized. Routes ready to be matched.');
    console.log('Cache status (on AppRoutes mount):', queryClient.getQueryCache().getAll().length > 0 ? 'Cache populated' : 'Empty cache');
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
      <Route path="/app-guide" element={<ProtectedRoute><AppGuidePage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Main App component
const App = () => {
  useEffect(() => {
    console.log('App component initialized. React Router and PersistQueryClientProvider setup.');
    
    // Network status listeners have been moved to NetworkStatusProvider
    // const handleOnline = () => { ... };
    // const handleOffline = () => { ... };
    // window.removeEventListener('online', handleOnline);
    // window.removeEventListener('offline', handleOffline);
    
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: localforagePersister,
        buster: APP_CACHE_VERSION,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      }}
      onSuccess={() => {
        console.log('React Query cache hydration successful.');
        queryClient.resumePausedMutations().then(() => {
          console.log('Paused mutations resumed after hydration.');
        }).catch(error => {
          console.error('Error resuming paused mutations:', error);
        });
      }}
    >
      <BrowserRouter>
        <NetworkStatusProvider> {/* Wrap with NetworkStatusProvider */}
          <AuthProvider>
            <Toaster />
            <AppRoutes />
            <OfflineBanner /> {/* Add OfflineBanner here */}
          </AuthProvider>
        </NetworkStatusProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
};

export default App;
