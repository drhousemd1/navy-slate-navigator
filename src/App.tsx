
import React, { useEffect } from 'react';
import AppRoutes from './AppRoutes';
import { Toaster } from '@/components/ui/toaster';
import { OfflineBanner } from './components/OfflineBanner';
import Hydrate from './components/Hydrate';
import { usePreloadAppCoreData } from '@/data/preload/usePreloadAppCoreData';
// AuthenticatedAppLoader import is removed

// APP_CACHE_VERSION is used by AppProviders now
// import { APP_CACHE_VERSION } from './lib/react-query-config';

// PersistQueryClientProvider and related imports are removed as AppProviders handles this

function App() {
  usePreloadAppCoreData();

  // The onAuthStateChange listener previously here was removed
  // as auth state changes (including sign out cache clearing) are centralized in AuthContext.tsx

  return (
    // AuthenticatedAppLoader wrapper is removed
    <Hydrate fallbackMessage="Failed to load application data. Please try clearing site data or contact support.">
      <Toaster />
      <AppRoutes />
      <OfflineBanner />
      {/* Removed: <SyncStatusIndicator /> */}
      {/* <CacheMonitorPanel /> */}
    </Hydrate>
  );
}

export default App;
