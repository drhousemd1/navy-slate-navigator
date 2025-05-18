
import React from 'react';
import { useIsMutating, useIsFetching } from '@tanstack/react-query';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { LoaderCircle } from 'lucide-react';

const SyncStatusIndicator: React.FC = () => {
  const { isSyncing } = useSyncManager();
  const pendingMutations = useIsMutating();
  const activeFetches = useIsFetching(); // Number of queries fetching (incl. initial load & background)
  const { isOnline } = useNetworkStatus();

  let message: string | null = null;

  if (!isOnline) {
    // Offline state
    if (pendingMutations > 0) {
      message = `Queued ${pendingMutations} change${pendingMutations > 1 ? 's' : ''}...`;
    }
    // No general "refreshing" message when offline as queries won't fetch.
  } else {
    // Online states
    if (isSyncing) {
      message = "Syncing data...";
    } else if (pendingMutations > 0) {
      message = `Saving ${pendingMutations} change${pendingMutations > 1 ? 's' : ''}...`;
    } else if (activeFetches > 0) {
      // This indicates background refetches or initial loads not covered by isSyncing or pendingMutations.
      message = "Refreshing data...";
    }
  }

  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-slate-700 text-white p-3 rounded-lg shadow-xl flex items-center text-sm z-50">
      <LoaderCircle className="animate-spin h-5 w-5 mr-2" />
      {message}
    </div>
  );
};

export default SyncStatusIndicator;

