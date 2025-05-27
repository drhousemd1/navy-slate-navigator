
import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface SyncStatusIndicatorProps {
  onStatusChange?: (status: string) => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  onStatusChange 
}) => {
  const { isOnline } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>(
    isOnline ? 'synced' : 'offline'
  );

  useEffect(() => {
    const newStatus = isOnline ? 'synced' : 'offline';
    setSyncStatus(newStatus);
    onStatusChange?.(newStatus);
    logger.log(`Sync status changed to: ${newStatus}`);
  }, [isOnline, onStatusChange]);

  return (
    <div className="flex items-center">
      {syncStatus === 'synced' && (
        <Wifi className="h-4 w-4 text-success" />
      )}
      {syncStatus === 'offline' && (
        <WifiOff className="h-4 w-4 text-destructive" />
      )}
      {syncStatus === 'syncing' && (
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      )}
      {syncStatus === 'error' && (
        <Wifi className="h-4 w-4 text-warning" />
      )}
      
      <span className={cn(
        "ml-2 text-xs",
        syncStatus === 'synced' && "text-success",
        syncStatus === 'offline' && "text-destructive",
        syncStatus === 'syncing' && "text-primary",
        syncStatus === 'error' && "text-warning",
      )}>
        {syncStatus === 'synced' && "Synced"}
        {syncStatus === 'offline' && "Offline"}
        {syncStatus === 'syncing' && "Syncing..."}
        {syncStatus === 'error' && "Error"}
      </span>
    </div>
  );
};

export default SyncStatusIndicator;
