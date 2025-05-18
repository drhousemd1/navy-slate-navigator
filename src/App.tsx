import React, { useEffect } from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { supabase } from './integrations/supabase/client';
import { OfflineBanner } from './components/OfflineBanner';
import SyncStatusIndicator from './components/common/SyncStatusIndicator';
import { queryClient } from './data/queryClient';
import Hydrate from './components/Hydrate';
import { purgeQueryCache } from './lib/react-query-config';
import { usePreloadAppCoreData } from '@/data/preload/usePreloadAppCoreData';

// APP_CACHE_VERSION is used by AppProviders now
// import { APP_CACHE_VERSION } from './lib/react-query-config';

// PersistQueryClientProvider and related imports are removed as AppProviders handles this
// import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
// import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
// import localforage from 'localforage';

function App() {
  usePreloadAppCoreData();

  useEffect(() => {
    const { data: { subscription: authStateUnsub } } = supabase.auth.onAuthStateChange(async (event, session) => { // Make async
      console.log('Auth state change event:', event, "Session:", session);
      if (event === "SIGNED_OUT") {
        // queryClient.clear(); // This is handled by purgeQueryCache
        await purgeQueryCache(queryClient); // Use purgeQueryCache to clear in-memory and persisted cache
        console.log('Full cache (in-memory and persisted) cleared on SIGNED_OUT.');
      }
    });
    return () => {
      authStateUnsub.unsubscribe();
    };
  }, []);

  return (
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
