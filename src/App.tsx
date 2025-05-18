
import React from 'react';
import { Toaster as SonnerToaster } from 'sonner'; // Renamed to avoid conflict with our Toaster
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { AuthProvider } from '@/contexts/auth'; // Changed import path
import { ThemeProvider } from 'next-themes';
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import { OfflineBanner } from './components/OfflineBanner'; // Changed from default import
import { queryClient } from './data/queryClient';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import { APP_CACHE_VERSION } from './lib/react-query-config'; // Import the cache version
import ErrorBoundary from '@/components/ErrorBoundary'; // Import ErrorBoundary

// Import fetch functions for prefetching
import { fetchTasks } from '@/data/queries/tasks/fetchTasks';
import { fetchRewards, REWARDS_QUERY_KEY } from '@/data/rewards/queries';
import { fetchRules } from '@/data/rules/fetchRules';
import { fetchPunishments } from '@/data/punishments/queries/fetchPunishments';

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
                  queryClient.resumePausedMutations().then(() => {
                    console.log('React Query cache restored and mutations resumed from App.tsx Persister.');
                  }).catch(error => {
                    console.error('Error resuming paused mutations after hydration from App.tsx Persister:', error);
                  });

                  // Prefetch critical data after hydration
                  console.log('[App] Hydration successful, prefetching critical data...');
                  const criticalQueriesToPrefetch = [
                    { queryKey: ['tasks'], queryFn: fetchTasks, name: 'Tasks' },
                    { queryKey: REWARDS_QUERY_KEY, queryFn: fetchRewards, name: 'Rewards' },
                    { queryKey: ['rules'], queryFn: fetchRules, name: 'Rules' },
                    { queryKey: ['punishments'], queryFn: fetchPunishments, name: 'Punishments' },
                  ] as const; // Added 'as const' here

                  criticalQueriesToPrefetch.forEach(async ({ queryKey, queryFn, name }) => {
                    // Only prefetch if not already fetching or fresh
                    const queryState = queryClient.getQueryState(queryKey);
                    if (!queryState || queryState.status === 'pending') {
                       try {
                         console.log(`[App] Attempting to prefetch ${name}`);
                         await queryClient.prefetchQuery({ queryKey, queryFn });
                         console.log(`[App] Successfully initiated prefetch for ${name}`);
                       } catch (error) {
                         console.error(`[App] Error prefetching ${name}:`, error);
                       }
                    } else {
                        console.log(`[App] Skipping prefetch for ${name}, data likely fresh or already fetching.`);
                    }
                  });
                }}
              >
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
                <SonnerToaster /> {/* Using the aliased import */}
                <OfflineBanner />
                {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
              </PersistQueryClientProvider>
            </NetworkStatusProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </React.StrictMode>
  );
}

export default App;
