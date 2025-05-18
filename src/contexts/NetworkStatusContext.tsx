import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { queryClient } from '@/data/queryClient';
import { toast } from '@/hooks/use-toast';

interface NetworkStatusContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastOnlineTime: Date | null;
  reconnectTime: Date | null;
  pendingMutationsCount: number;
  forceSyncNow: () => Promise<void>;
}

export const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

interface NetworkStatusProviderProps {
  children: ReactNode;
}

export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false); // This is for forceSyncNow
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(isOnline ? new Date() : null);
  const [reconnectTime, setReconnectTime] = useState<Date | null>(null);
  const [pendingMutationsCount, setPendingMutationsCount] = useState(0);

  // Track pending mutations
  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();
    
    const updatePendingCount = () => {
      const mutations = mutationCache.getAll();
      const pending = mutations.filter(mutation => 
        mutation.state.status === 'pending' // React Query v5 status for paused/offline
      ).length;
      setPendingMutationsCount(pending);
    };

    updatePendingCount(); // Initial count
    const unsubscribe = mutationCache.subscribe(updatePendingCount);
    
    return () => {
      unsubscribe();
    };
  }, []);

  const forceSyncNow = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline. Please check your connection.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSyncing(true);
    const MAX_RETRIES = 1; // Try original + 1 retry
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        if (attempt > 0) {
          toast({ title: `Sync Retry (Attempt ${attempt + 1})`, description: "Trying to synchronize your data again..."});
        } else {
          toast({ title: "Syncing Data...", description: "Attempting to synchronize your data." });
        }
        
        console.log(`[NetworkStatusContext] forceSyncNow - Attempt ${attempt + 1}`);
        // Resume any paused mutations first
        await queryClient.resumePausedMutations();
        console.log(`[NetworkStatusContext] Paused mutations resumed (if any).`);
        
        // Invalidate critical queries to force refetch
        const criticalQueries = [
          ['rewards'], ['tasks'], ['rules'], ['punishments'], ['profile'],
          // Add specific points queries if they are separate and critical for immediate sync
          // Example: REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY from useSyncManager
        ];
        
        console.log('[NetworkStatusContext] Invalidating critical queries:', criticalQueries.map(q => q.join('/')));
        await Promise.all(
          criticalQueries.map(queryKey => 
            queryClient.invalidateQueries({queryKey})
          )
        );
        
        toast({
          title: "Sync Complete",
          description: "Your data has been successfully synchronized.",
          variant: "default", // 'default' for sonner success
        });
        setIsSyncing(false);
        return; // Successful sync
      } catch (error) {
        console.error(`[NetworkStatusContext] Error during forced sync (Attempt ${attempt + 1}):`, error);
        if (attempt < MAX_RETRIES) {
          toast({
            title: `Sync Attempt ${attempt + 1} Failed`,
            description: "Will retry shortly...",
            variant: "default", // 'default' for sonner warning/info
          });
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retrying
          attempt++;
        } else {
          toast({
            title: "Sync Failed",
            description: "Could not synchronize data after multiple attempts. Please check console.",
            variant: "destructive",
          });
          setIsSyncing(false);
          return; // Final failure
        }
      }
    }
    // Fallback, though theoretically unreachable if loop logic is correct
    setIsSyncing(false);
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[NetworkStatusContext] App is back online.');
      setIsOnline(true);
      setReconnectTime(new Date());
      
      if (lastOnlineTime !== null) { // Avoid toast on initial load if already online
        toast({
          title: 'Back Online',
          description: 'Connection restored. Syncing pending changes.',
          variant: 'default',
        });
      }
      
      queryClient.resumePausedMutations()
        .then(() => {
          const currentPendingCount = queryClient.getMutationCache().getAll().filter(m => m.state.status === 'pending').length;
          console.log(`[NetworkStatusContext] Paused mutations resumed. Pending count now: ${currentPendingCount}`);
          if (currentPendingCount > 0 && lastOnlineTime !== null) { // Only toast if there were actual mutations processed due to going online
             // This toast might be redundant if forceSyncNow or other mechanisms also toast.
             // For now, let's keep it simple.
          }
        })
        .catch(error => {
          console.error('[NetworkStatusContext] Error resuming paused mutations on network online:', error);
          toast({
            title: 'Sync Error',
            description: 'Could not resume all pending operations. Try manual sync.',
            variant: 'destructive',
          });
        });
    };

    const handleOffline = () => {
      console.log('[NetworkStatusContext] App is offline.');
      setIsOnline(false);
      setLastOnlineTime(new Date()); // Record the time we went offline
      
      toast({
        title: 'Offline Mode Active',
        description: 'You are now offline. Changes will be saved locally.',
        variant: 'default',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check and setup
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
        setLastOnlineTime(new Date()); // If starting offline, record it.
    }
    
    // Initial pending mutations count
    const initialMutations = queryClient.getMutationCache().getAll();
    const initialPending = initialMutations.filter(m => m.state.status === 'pending').length;
    setPendingMutationsCount(initialPending);
    console.log(`[NetworkStatusContext] Initial pending mutations: ${initialPending}`);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lastOnlineTime]); // Removed pendingMutationsCount from dependency array as it's managed by its own effect now

  return (
    <NetworkStatusContext.Provider value={{ 
      isOnline, 
      isSyncing, 
      lastOnlineTime, 
      reconnectTime, 
      pendingMutationsCount,
      forceSyncNow
    }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};
