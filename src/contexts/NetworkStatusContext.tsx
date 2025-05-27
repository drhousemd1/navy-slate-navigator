
import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react'; // Added useContext
import { queryClient } from '@/data/queryClient';
import { toast } from '@/hooks/use-toast';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';
import { QueryKey } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

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

const CRITICAL_QUERY_KEYS_FOR_FORCESYNC: QueryKey[] = [
  ['tasks'],
  ['rewards'],
  REWARDS_POINTS_QUERY_KEY,
  REWARDS_DOM_POINTS_QUERY_KEY,
  ['punishments'],
  ['punishment_history'], // Added punishment history
  ['rules'],
  ['profile'],
  // Consider adding ['messages'] if they are critical to sync this way
];

export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(isOnline ? new Date() : null);
  const [reconnectTime, setReconnectTime] = useState<Date | null>(null);
  const [pendingMutationsCount, setPendingMutationsCount] = useState(0);

  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();
    
    const updatePendingCount = () => {
      const mutations = mutationCache.getAll();
      const pending = mutations.filter(mutation => 
        mutation.state.status === 'pending'
      ).length;
      setPendingMutationsCount(pending);
    };

    updatePendingCount();
    logger.info(`[NetworkStatusContext] Initial pending mutations: ${pendingMutationsCount}`);
    const unsubscribe = mutationCache.subscribe(updatePendingCount);
    
    return () => {
      unsubscribe();
    };
  }, [pendingMutationsCount]); // Added pendingMutationsCount to dependency array to log initial count correctly.

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
        
        logger.info(`[NetworkStatusContext] forceSyncNow - Attempt ${attempt + 1}`);
        await queryClient.resumePausedMutations();
        logger.info(`[NetworkStatusContext] Paused mutations resumed (if any).`);
        
        const criticalQueriesToInvalidate = CRITICAL_QUERY_KEYS_FOR_FORCESYNC;
        
        logger.info('[NetworkStatusContext] Invalidating critical queries:', criticalQueriesToInvalidate.map(q => Array.isArray(q) ? q.join('/') : String(q)));
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
        logger.error(`[NetworkStatusContext] Error during forced sync/refresh (Attempt ${attempt + 1}):`, error);
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
      logger.info('[NetworkStatusContext] App is back online.');
      setIsOnline(true);
      setReconnectTime(new Date());
      
      if (lastOnlineTime !== null) {
        toast({
          title: 'Back Online',
          description: 'Connection restored. Syncing pending changes.',
          variant: 'default',
        });
      }
      
      queryClient.resumePausedMutations()
        .then(() => {
          const currentPendingCount = queryClient.getMutationCache().getAll().filter(m => m.state.status === 'pending').length;
          logger.info(`[NetworkStatusContext] Paused mutations resumed. Pending count now: ${currentPendingCount}`);
        })
        .catch(error => {
          logger.error('[NetworkStatusContext] Error resuming paused mutations on network online:', error);
          toast({
            title: 'Operation Error',
            description: 'Could not resume all pending operations. Try manual refresh.',
            variant: 'destructive',
          });
        });
    };

    const handleOffline = () => {
      logger.info('[NetworkStatusContext] App is offline.');
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lastOnlineTime]);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, isSyncing, lastOnlineTime, reconnectTime, pendingMutationsCount, forceSyncNow }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatus = (): NetworkStatusContextType => {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
};
