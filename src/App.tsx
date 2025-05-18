import React from 'react';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { AuthProvider } from '@/contexts/auth'; // Changed import path
import { ThemeProvider } from 'next-themes';
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import OfflineBanner from './components/OfflineBanner';
import { queryClient } from './data/queryClient';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import { APP_CACHE_VERSION } from './lib/react-query-config'; // Import the cache version

// Configure localforage if not already configured elsewhere for this purpose
localforage.config({
  name: 'kingdom-app-react-query', // Specific name for RQ cache
  storeName: 'query_cache',
  description: 'React Query cache for Kingdom App',
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: localforage,
  // You can add a throttle time here if needed, e.g., throttleTime: 1000
});

function App() {
  return (
    <React.StrictMode>
      <Router>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <AuthProvider>
            <NetworkStatusProvider>
              <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{
                  persister: asyncStoragePersister,
                  buster: APP_CACHE_VERSION, // Use app version for cache busting
                  maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
                }}
                onSuccess={() => {
                  // Resume paused mutations after hydration
                  queryClient.resumePausedMutations();
                  console.log('React Query cache restored and mutations resumed.');
                }}
              >
                <AppRoutes />
                <Toaster />
                <OfflineBanner />
                <ReactQueryDevtools initialIsOpen={false} />
              </PersistQueryClientProvider>
            </NetworkStatusProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </React.StrictMode>
  );
}

export default App;
