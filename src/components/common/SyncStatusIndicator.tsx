
import React from 'react';
import { useIsMutating, useIsFetching } from '@tanstack/react-query';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { LoaderCircle, WifiOff } from 'lucide-react'; // Added WifiOff for a clearer offline icon

const SyncStatusIndicator: React.FC = () => {
  const { isSyncing: backgroundSyncIsSyncing } = useSyncManager();
  const { isOnline, isSyncing: manualSyncIsSyncing, pendingMutationsCount: contextPendingMutations } = useNetworkStatus();
  
  // useIsMutating() is generally for mutations in flight. 
  // contextPendingMutations from NetworkStatusContext might be more accurate for "queued" mutations.
  // Let's use useIsMutating for active saving, and consider contextPendingMutations for offline queue if needed.
  const activeMutations = useIsMutating(); 
  const activeFetches = useIsFetching();

  let message: string | null = null;
  let icon: React.ReactNode = <LoaderCircle className="animate-spin h-5 w-5 mr-2" />;

  if (!isOnline) {
    // When offline, contextPendingMutations reflects mutations that were paused or queued.
    if (contextPendingMutations > 0) {
      message = `Offline: ${contextPendingMutations} change${contextPendingMutations > 1 ? 's' : ''} queued`;
    } else {
      message = "Offline";
    }
    icon = <WifiOff className="h-5 w-5 mr-2 text-yellow-400" />;
  } else {
    // Online states, prioritized
    if (manualSyncIsSyncing) {
      message = "Manual sync in progress...";
    } else if (backgroundSyncIsSyncing) {
      message = "Auto-sync in progress...";
    } else if (activeMutations > 0) {
      message = `Saving ${activeMutations} change${activeMutations > 1 ? 's' : ''}...`;
    } else if (activeFetches > 0) {
      // This indicates background refetches or initial loads not covered by other states.
      message = "Refreshing data...";
    }
    // If none of the above, message remains null (no indicator when idle and online)
  }

  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-slate-700 text-white p-3 rounded-lg shadow-xl flex items-center text-sm z-50">
      {icon}
      {message}
    </div>
  );
};

export default SyncStatusIndicator;
