
import React from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { LoaderCircle } from 'lucide-react';

const SyncStatusIndicator: React.FC = () => {
  const { isSyncing } = useSyncManager();
  const pendingMutations = useIsMutating();
  const { isOnline } = useNetworkStatus();

  let message = null;

  if (isSyncing) {
    message = "Syncing data...";
  } else if (pendingMutations > 0 && isOnline) {
    // OfflineBanner handles pending mutations when offline
    message = `Saving ${pendingMutations} change${pendingMutations > 1 ? 's' : ''}...`;
  }

  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-slate-700 text-white p-3 rounded-lg shadow-xl flex items-center text-sm z-50 animate-pulse">
      <LoaderCircle className="animate-spin h-5 w-5 mr-2" />
      {message}
    </div>
  );
};

export default SyncStatusIndicator;
