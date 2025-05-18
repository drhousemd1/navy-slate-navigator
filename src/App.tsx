
import React, { useEffect } from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from './integrations/supabase/client';
import { OfflineBanner } from './components/OfflineBanner';
import SyncStatusIndicator from './components/common/SyncStatusIndicator';
import { queryClient } from './data/queryClient';
// APP_CACHE_VERSION is used by AppProviders now
// import { APP_CACHE_VERSION } from './lib/react-query-config';

// PersistQueryClientProvider and related imports are removed as AppProviders handles this
// import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
// import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
// import localforage from 'localforage';
import Hydrate from './components/Hydrate';

// persister is now defined and used within AppProviders.tsx
// const persister = createAsyncStoragePersister({
//   storage: localforage,
//   key: 'REACT_QUERY_OFFLINE_CACHE',
//   throttleTime: 1000,
// });

function App() {
  useEffect(() => {
    const { data: { subscription: authStateUnsub } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event, "Session:", session);
      if (event === "SIGNED_OUT") {
        queryClient.clear(); // Consider if this should also clear persisted data more explicitly if needed
      }
    });
    return () => {
      authStateUnsub.unsubscribe();
    };
  }, []);

  return (
    // PersistQueryClientProvider has been moved to AppProviders.tsx
    <Hydrate fallbackMessage="Failed to load application data. Please try clearing site data or contact support.">
      <Toaster />
      <AppRoutes />
      <OfflineBanner />
      <SyncStatusIndicator />
      {/* <CacheMonitorPanel /> */}
    </Hydrate>
  );
}

export default App;
