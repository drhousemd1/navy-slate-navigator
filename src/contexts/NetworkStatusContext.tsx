
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { queryClient } from '@/data/queryClient'; // Import queryClient

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
      queryClient.resumePausedMutations().then(() => {
        console.log('Paused mutations resumed after going online.');
      }).catch(error => {
        console.error('Error resuming paused mutations on network online:', error);
      });
    };

    const handleOffline = () => {
      console.log('App is offline. Mutations will be paused by React Query if configured.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
        queryClient.resumePausedMutations().catch(error => {
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
