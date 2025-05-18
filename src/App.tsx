
import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { supabase } from './integrations/supabase/client';
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import { OfflineBanner } from './components/OfflineBanner';
import { SyncStatusIndicator } from './components/common/SyncStatusIndicator';
// import CacheMonitorPanel from './components/dev/CacheMonitorPanel'; // Usually for dev
import { AppProviders } from './components/app/AppProviders';
import { queryClient } from './data/queryClient'; // Ensure this is your configured QueryClient
import { APP_CACHE_VERSION } from './lib/react-query-config';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import localforage from 'localforage';
import Hydrate from './components/Hydrate'; // <-- New import

// Initialize the persister
const persister = createSyncStoragePersister({
  storage: localforage, // You can use localStorage, sessionStorage, or localforage
  key: 'REACT_QUERY_OFFLINE_CACHE', // Unique key for your app's cache
  throttleTime: 1000, // Optional: throttle time for writes
  // serialize: (client) => JSON.stringify(client), // Optional: custom serialization
  // deserialize: (cachedString) => JSON.parse(cachedString), // Optional: custom deserialization
});

function App() {
  useEffect(() => {
    const { data: { subscription: authStateUnsub } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event, "Session:", session);
      // Potentially invalidate queries or update user state here
      // For example, on SIGNED_OUT, clear query cache or specific user-related data
      if (event === "SIGNED_OUT") {
        queryClient.clear(); // Example: Clear cache on sign out
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
        // resume mutations after initial restore from localStorage was successful
        queryClient.resumePausedMutations().then(() => {
          console.log("Persisted queries hydrated and paused mutations resumed.");
          // Any logic that should run post-hydration can go here.
          // For example, kick off initial data prefetching for critical routes.
        });
      }}
    >
      <Hydrate fallbackMessage="Failed to load application data. Please try clearing site data or contact support.">
        <AppProviders>
          <Toaster />
          <AppRoutes />
          <OfflineBanner />
          <SyncStatusIndicator />
          {/* <CacheMonitorPanel /> */}
        </AppProviders>
      </Hydrate>
    </PersistQueryClientProvider>
  );
}

export default App;
