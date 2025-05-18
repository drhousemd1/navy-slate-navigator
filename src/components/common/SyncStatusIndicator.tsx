
import React from 'react';
import { useIsMutating, useIsFetching } from '@tanstack/react-query';
import { useSyncManager } from '@/hooks/useSyncManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Sync, Wifi, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SyncStatusIndicator: React.FC = () => {
  const { isSyncing: backgroundSyncIsSyncing } = useSyncManager();
  const { 
    isOnline, 
    isSyncing: manualSyncIsSyncing, 
    pendingMutationsCount: contextPendingMutations 
  } = useNetworkStatus();
  
  const activeMutations = useIsMutating(); 
  const activeFetches = useIsFetching();

  let message: string = "Online"; // Default message
  let icon: React.ReactNode = <Wifi className="h-5 w-5 text-green-500" />; // Default to online icon
  let iconColorClass = "text-green-500";

  if (!isOnline) {
    if (contextPendingMutations > 0) {
      message = `Offline: ${contextPendingMutations} change${contextPendingMutations > 1 ? 's' : ''} queued`;
      icon = <AlertTriangle className="h-5 w-5 text-orange-400" />;
      iconColorClass = "text-orange-400";
    } else {
      message = "Offline";
      icon = <WifiOff className="h-5 w-5 text-yellow-400" />;
      iconColorClass = "text-yellow-400";
    }
  } else {
    // Online states, prioritized
    if (manualSyncIsSyncing) {
      message = "Manual sync in progress...";
      icon = <Sync className="h-5 w-5 animate-spin text-blue-400" />;
      iconColorClass = "text-blue-400";
    } else if (backgroundSyncIsSyncing) {
      message = "Auto-sync in progress...";
      icon = <Sync className="h-5 w-5 animate-spin text-blue-400" />;
      iconColorClass = "text-blue-400";
    } else if (activeMutations > 0) {
      message = `Saving ${activeMutations} change${activeMutations > 1 ? 's' : ''}...`;
      icon = <Sync className="h-5 w-5 animate-spin text-blue-400" />;
      iconColorClass = "text-blue-400";
    } else if (activeFetches > 0) {
      message = "Refreshing data...";
      icon = <Sync className="h-5 w-5 animate-spin text-cyan-400" />;
      iconColorClass = "text-cyan-400";
    }
    // If none of the above, message is "Online" and icon is Wifi (green)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`cursor-pointer p-1 rounded-md hover:bg-gray-700/50 transition-colors ${iconColorClass}`}>
            {icon}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-800 text-white border-slate-700">
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SyncStatusIndicator;
