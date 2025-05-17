
import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';

const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black p-3 text-center z-50 flex items-center justify-center animate-pulse">
      <WifiOff className="w-5 h-5 mr-2" />
      You are currently offline. Some features may be limited.
    </div>
  );
};

export default OfflineBanner;
