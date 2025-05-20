
import React from 'react';
import { useNetworkStatus } from '@/contexts/NetworkStatusContext'; // This import should work if NetworkStatusContext.tsx exports useNetworkStatus
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineBanner = () => {
  const networkStatus = useNetworkStatus(); // Get the whole context object
  
  if (networkStatus?.isOnline) return null; // Access isOnline from the context object
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-600 text-white px-4 py-2 shadow-lg flex items-center justify-center z-50 animate-fade-in">
      <WifiOff className="w-4 h-4 mr-2" />
      <p className="text-sm font-medium">You're currently offline. Some features may be limited.</p>
    </div>
  );
};

export const NetworkStatusIndicator = () => {
  const networkStatus = useNetworkStatus(); // Get the whole context object
  
  return (
    <div className="flex items-center">
      {networkStatus?.isOnline ? ( // Access isOnline from the context object
        <Wifi className="w-4 h-4 text-green-500" />
      ) : (
        <WifiOff className="w-4 h-4 text-yellow-500" />
      )}
      <span className="ml-2 text-xs font-medium">
        {networkStatus?.isOnline ? 'Online' : 'Offline'} 
      </span>
    </div>
  );
};
