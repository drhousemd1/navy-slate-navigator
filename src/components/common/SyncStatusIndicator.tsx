
import React from 'react';
import { useIsMutating, useIsFetching } from '@tanstack/react-query';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

const SyncStatusIndicator: React.FC = () => {
  const { isSyncing: backgroundSyncIsSyncing } = useSyncManager();
  const { isOnline, isSyncing: manualSyncIsSyncing, pendingMutationsCount: contextPendingMutations } = useNetworkStatus();
  
  const activeMutations = useIsMutating(); 
  const activeFetches = useIsFetching();

  let message: string | null = null;
  let icon: React.ReactNode = <Skeleton className="h-5 w-5 mr-2 rounded-full animate-pulse bg-slate-500" />; // Default to skeleton pulse

  if (!isOnline) {
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
      // icon will be the default skeleton pulse
    } else if (backgroundSyncIsSyncing) {
      message = "Auto-sync in progress...";
      // icon will be the default skeleton pulse
    } else if (activeMutations > 0) {
      message = `Saving ${activeMutations} change${activeMutations > 1 ? 's' : ''}...`;
      // icon will be the default skeleton pulse
    } else if (activeFetches > 0) {
      message = "Refreshing data...";
      // icon will be the default skeleton pulse
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
