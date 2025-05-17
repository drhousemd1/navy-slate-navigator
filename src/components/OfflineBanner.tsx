
import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, LoaderCircle } from 'lucide-react';
import { useIsMutating } from '@tanstack/react-query';

const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const pendingMutations = useIsMutating(); // Get count of all pending mutations

  if (isOnline) {
    return null;
  }

  let message = "You are currently offline. Some features may be limited.";
  if (pendingMutations > 0) {
    message = `You are currently offline. ${pendingMutations} operation${pendingMutations > 1 ? 's are' : ' is'} pending.`;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black p-3 text-center z-50 flex items-center justify-center animate-pulse">
      {pendingMutations > 0 ? (
        <LoaderCircle className="w-5 h-5 mr-2 animate-spin" />
      ) : (
        <WifiOff className="w-5 h-5 mr-2" />
      )}
      {message}
    </div>
  );
};

export default OfflineBanner;

