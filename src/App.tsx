
import React, { useEffect } from 'react';
// Removed ThemeProvider import, AppProviders in main.tsx handles it.
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
// AuthProvider might be part of AppProviders or used differently, assuming it's needed here or within AppProviders.
// import { AuthProvider } from './contexts/AuthContext'; // Check if AppProviders covers this
import { supabase } from './integrations/supabase/client';
// NetworkStatusProvider might be part of AppProviders
// import { NetworkStatusProvider } from './contexts/NetworkStatusContext'; // Check if AppProviders covers this
import { OfflineBanner } from './components/OfflineBanner';
import SyncStatusIndicator from './components/common/SyncStatusIndicator'; // Changed to default import
// import CacheMonitorPanel from './components/dev/CacheMonitorPanel'; // Usually for dev
import { AppProviders } from './components/app/AppProviders'; // This was wrapping content INSIDE App, but App is ALREADY wrapped by AppProviders in main.tsx
import { queryClient } from './data/queryClient';
import { APP_CACHE_VERSION } from './lib/react-query-config';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
// Import createAsyncStoragePersister for localforage
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import Hydrate from './components/Hydrate';

// Initialize the persister using createAsyncStoragePersister
const persister = createAsyncStoragePersister({
  storage: localforage, // localforage is compatible with AsyncStorage interface
  key: 'REACT_QUERY_OFFLINE_CACHE',
  throttleTime: 1000,
});

function App() {
  useEffect(() => {
    const { data: { subscription: authStateUnsub } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event, "Session:", session);
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });
    return () => {
      authStateUnsub.unsubscribe();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: APP_CACHE_VERSION }}
      onSuccess={() => {
        queryClient.resumePausedMutations().then(() => {
          console.log("Persisted queries hydrated and paused mutations resumed.");
        });
      }}
    >
      <Hydrate fallbackMessage="Failed to load application data. Please try clearing site data or contact support.">
        {/* AppProviders was here, removed as App is already wrapped by it in main.tsx */}
        <Toaster />
        <AppRoutes />
        <OfflineBanner />
        <SyncStatusIndicator />
        {/* <CacheMonitorPanel /> */}
      </Hydrate>
    </PersistQueryClientProvider>
  );
}

export default App;
