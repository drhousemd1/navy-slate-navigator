import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { queryClient } from '@/data/queryClient'; // Import queryClient
import { toast } from '@/hooks/use-toast'; // Import toast

interface NetworkStatusContextType {
  isOnline: boolean;
}

export const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

interface NetworkStatusProviderProps {
  children: ReactNode;
}

export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('App is back online. Resuming normal operation.');
      setIsOnline(true);
      toast({
        title: 'Back Online',
        description: 'Connection restored. Attempting to sync pending changes.',
        variant: 'default',
      });
      queryClient.resumePausedMutations().then(() => {
        console.log('Paused mutations resumed after going online.');
        // Check if there were any mutations to resume
        // This requires a bit more specific logic if we only want to toast if something *was* resumed.
        // For now, a general success or if React Query provides a way to know if queue was processed.
        // Assuming a general attempt is made, a success toast if no error is fine.
        toast({
          title: 'Sync Resumed',
          description: 'Pending operations are being processed.',
          variant: 'default',
        });
      }).catch(error => {
        console.error('Error resuming paused mutations on network online:', error);
        toast({
          title: 'Sync Error',
          description: 'Could not resume all pending operations. Please check your connection or try again later.',
          variant: 'destructive',
        });
      });
    };

    const handleOffline = () => {
      console.log('App is offline. Mutations will be paused by React Query if configured.');
      setIsOnline(false);
      // The OfflineBanner will appear, so a toast here might be redundant
      // unless we want to be very explicit.
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      // Only attempt to resume and toast if it's not the very initial app load / or if there's a way to know mutations were paused.
      // For simplicity, we can keep the resume attempt.
      // A toast here might be too early if the app is just starting.
      // Let's defer the initial check toast to avoid startup noise,
      // handleOnline will cover transitions from offline to online.
      queryClient.resumePausedMutations().catch(error => {
        // This error on initial load might not need a toast unless it's critical.
        console.error('Error resuming paused mutations on initial check:', error);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isOnline }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};
