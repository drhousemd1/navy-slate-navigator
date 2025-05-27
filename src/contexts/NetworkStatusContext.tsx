import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { queryClient } from '@/data/queryClient';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries'; // Import points query keys
import { QueryKey } from '@tanstack/react-query'; // Import QueryKey type
import { logger } from '@/lib/logger'; // Added logger import

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

// Define critical query keys here
const CRITICAL_QUERY_KEYS_FOR_FORCESYNC: QueryKey[] = [
  ['tasks'],
  ['rewards'],
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS_QUERY_KEY,
  ['punishments'],
  ['rules'],
  ['profile'],
];


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
    const MAX_RETRIES = 1; 
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        if (attempt > 0) {
          toast({ title: `Sync Retry (Attempt ${attempt + 1})`, description: "Trying to synchronize your data again..."});
        } else {
          toast({ title: "Refreshing Data...", description: "Attempting to refresh your data." });
        }
        
        logger.debug(`[NetworkStatusContext] forceSyncNow - Attempt ${attempt + 1}`); // Replaced console.log
        await queryClient.resumePausedMutations();
        logger.debug(`[NetworkStatusContext] Paused mutations resumed (if any).`); // Replaced console.log
        
        // Use the defined CRITICAL_QUERY_KEYS_FOR_FORCESYNC
        const criticalQueriesToInvalidate = CRITICAL_QUERY_KEYS_FOR_FORCESYNC;
        
        logger.debug('[NetworkStatusContext] Invalidating critical queries:', criticalQueriesToInvalidate.map(q => Array.isArray(q) ? q.join('/') : String(q))); // Replaced console.log
        await Promise.all(
          criticalQueriesToInvalidate.map(queryKey => 
            queryClient.invalidateQueries({queryKey})
          )
        );
        
        toast({
          title: "Data Refresh Complete",
          description: "Your data has been successfully refreshed.",
          variant: "default", 
        });
        setIsSyncing(false);
        return; 
      } catch (error) {
        logger.error(`[NetworkStatusContext] Error during forced sync/refresh (Attempt ${attempt + 1}):`, error); // Replaced console.error
        if (attempt < MAX_RETRIES) {
          toast({
            title: `Refresh Attempt ${attempt + 1} Failed`,
            description: "Will retry shortly...",
            variant: "default", 
          });
          await new Promise(resolve => setTimeout(resolve, 3000)); 
          attempt++;
        } else {
          toast({
            title: "Data Refresh Failed",
            description: "Could not refresh data after multiple attempts. Please check console.",
            variant: "destructive",
          });
          setIsSyncing(false);
          return; 
        }
      }
    }
    setIsSyncing(false);
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      logger.debug('[NetworkStatusContext] App is back online.'); // Replaced console.log
      setIsOnline(true);
      setReconnectTime(new Date());
      
      if (lastOnlineTime !== null) { // Avoid toast on initial load if already online
        toast({
          title: 'Back Online',
          description: 'Connection restored. Syncing pending changes.', // Message can be generic now
          variant: 'default',
        });
      }
      
      queryClient.resumePausedMutations()
        .then(() => {
          const currentPendingCount = queryClient.getMutationCache().getAll().filter(m => m.state.status === 'pending').length;
          logger.debug(`[NetworkStatusContext] Paused mutations resumed. Pending count now: ${currentPendingCount}`); // Replaced console.log
          // Toasting for resumed mutations can be kept if desired, or removed for less noise
        })
        .catch(error => {
          logger.error('[NetworkStatusContext] Error resuming paused mutations on network online:', error); // Replaced console.error
          toast({
            title: 'Operation Error', // Generic error
            description: 'Could not resume all pending operations. Try manual refresh.',
            variant: 'destructive',
          });
        });
    };

    const handleOffline = () => {
      logger.debug('[NetworkStatusContext] App is offline.'); // Replaced console.log
      setIsOnline(false);
      setLastOnlineTime(new Date()); 
      
      toast({
        title: 'Offline Mode Active',
        description: 'You are now offline. Changes will be saved locally.',
        variant: 'default',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
        setLastOnlineTime(new Date()); 
    }
    
    const initialMutations = queryClient.getMutationCache().getAll();
    const initialPending = initialMutations.filter(m => m.state.status === 'pending').length;
    setPendingMutationsCount(initialPending);
    logger.debug(`[NetworkStatusContext] Initial pending mutations: ${initialPending}`); // Replaced console.log

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lastOnlineTime]);

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
