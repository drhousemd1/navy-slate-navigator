
import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineBanner = () => {
  const { isOnline } = useNetworkStatus();
  
  if (isOnline) return null;
  
  return (
    <div role="status" className="shrink-0 bg-amber-950 text-amber-100 px-4 py-2 flex items-center justify-center">
      <WifiOff aria-hidden="true" className="w-4 h-4 mr-2 shrink-0" />
      <p className="text-sm">Connection unavailable. Check Saved actions for what is pending; displayed totals may be out of date.</p>
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
        {isOnline ? 'Network connected' : 'Offline'}
      </span>
    </div>
  );
};
