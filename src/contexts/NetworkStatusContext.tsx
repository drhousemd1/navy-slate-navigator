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
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(isOnline ? new Date() : null);
  const [reconnectTime, setReconnectTime] = useState<Date | null>(null);
  const [pendingMutationsCount, setPendingMutationsCount] = useState(0);

  // Track pending mutations
  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();
    
    const unsubscribe = mutationCache.subscribe(() => {
      const mutations = mutationCache.getAll();
      const pending = mutations.filter(mutation => 
        mutation.state.status === 'pending'
      ).length;
      
      setPendingMutationsCount(pending);
    });
    
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
    
    try {
      // Resume any paused mutations
      await queryClient.resumePausedMutations();
      
      // Invalidate critical queries to force refetch
      const criticalQueries = [
        ['rewards'],
        ['tasks'],
        ['rules'],
        ['punishments'],
        ['profile'],
      ];
      
      await Promise.all(
        criticalQueries.map(queryKey => 
          queryClient.invalidateQueries({queryKey})
        )
      );
      
      toast({
        title: "Sync Complete",
        description: "Your data has been successfully synchronized.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error during forced sync:", error);
      toast({
        title: "Sync Failed",
        description: "There was an error synchronizing your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('App is back online. Resuming normal operation.');
      setIsOnline(true);
      setReconnectTime(new Date());
      
      // Don't show toast immediately on initial load
      if (lastOnlineTime !== null) {
        toast({
          title: 'Back Online',
          description: 'Connection restored. Attempting to sync pending changes.',
          variant: 'default',
        });
      }
      
      // Resume paused mutations
      queryClient.resumePausedMutations()
        .then(() => {
          console.log('Paused mutations resumed after going online.');
          
          // Only toast if there were paused mutations
          if (pendingMutationsCount > 0) {
            toast({
              title: 'Sync Resumed',
              description: `Processing ${pendingMutationsCount} pending operations.`,
              variant: 'default',
            });
          }
        })
        .catch(error => {
          console.error('Error resuming paused mutations on network online:', error);
          toast({
            title: 'Sync Error',
            description: 'Could not resume all pending operations. Please try again later.',
            variant: 'destructive',
          });
        });
    };

    const handleOffline = () => {
      console.log('App is offline. Mutations will be paused by React Query.');
      setIsOnline(false);
      setLastOnlineTime(new Date());
      
      toast({
        title: 'Offline Mode',
        description: 'You are now offline. Changes will be saved when you reconnect.',
        variant: 'default',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);
    
    // Only attempt to resume and toast if not initial load
    if (navigator.onLine && lastOnlineTime !== null) {
      queryClient.resumePausedMutations().catch(error => {
        console.error('Error resuming paused mutations on initial check:', error);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lastOnlineTime, pendingMutationsCount]);

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
