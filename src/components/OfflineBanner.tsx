
import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineBanner = () => {
  const { isOnline } = useNetworkStatus();
  
  if (isOnline) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-600 text-white px-4 py-2 shadow-lg flex items-center justify-center z-50 animate-fade-in">
      <WifiOff className="w-4 h-4 mr-2" />
      <p className="text-sm font-medium">You're currently offline. Some features may be limited.</p>
    </div>
  );
};

export const NetworkStatusIndicator = () => {
  const { isOnline } = useNetworkStatus();
  
  return (
    <div className="flex items-center">
      {isOnline ? (
        <Wifi className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-yellow-500" />
      )}
      <span className="ml-2 text-xs font-medium">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

