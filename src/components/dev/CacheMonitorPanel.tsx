import React, { useState, useEffect, useCallback } from 'react';
import { queryClient as appQueryClient } from '@/data/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderIcon, TrashIcon } from 'lucide-react';
import {
  getInMemoryCacheStatus,
  getPersistedReactQueryCacheInfo,
  listLocalForageKeysForReactQueryStore,
  getTotalSizeOfReactQueryLocalForageStore,
  clearAllAppCache,
  clearInMemoryCache
} from '@/lib/cacheDiagnostics';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

interface CacheStats {
  inMemory: { totalQueries: number } | null;
  persisted: { exists: boolean; sizeBytes: number | null; lastPersistedTimestamp: number | null } | null;
  localForageKeys: string[] | null;
  totalLocalForageSize: number | null;
}

const CacheMonitorPanel: React.FC = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const inMemory = getInMemoryCacheStatus(appQueryClient);
      const persisted = await getPersistedReactQueryCacheInfo();
      const localForageKeys = await listLocalForageKeysForReactQueryStore();
      const totalLocalForageSize = await getTotalSizeOfReactQueryLocalForageStore();
      setStats({
        inMemory,
        persisted,
        localForageKeys,
        totalLocalForageSize,
      });
    } catch (error) {
      logger.error("Failed to fetch cache stats:", error);
      setStats(null); // Or set an error state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleClearAllCache = async () => {
    if (window.confirm('Are you sure you want to clear ALL cache (in-memory and persisted)?')) {
      setIsLoading(true);
      await clearAllAppCache();
      await fetchStats(); // Refresh stats after clearing
      setIsLoading(false);
    }
  };

  const handleClearInMemoryCache = async () => {
    if (window.confirm('Are you sure you want to clear the IN-MEMORY cache?')) {
      setIsLoading(true);
      clearInMemoryCache(appQueryClient);
      await fetchStats(); // Refresh stats
      setIsLoading(false);
    }
  };
  
  const formatBytes = (bytes: number | null | undefined): string => {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number | null | undefined): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  }

  const StatItem: React.FC<{ label: string; value: string | number | null | undefined; isLoading?: boolean }> = ({ label, value, isLoading: itemLoading }) => (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}:</span>
      {itemLoading ? <Skeleton className="h-4 w-24 bg-gray-700" /> : <span className="font-medium text-white">{String(value ?? 'N/A')}</span>}
    </div>
  );

  return (
    <Card className="bg-slate-900 border-slate-700 text-white fixed bottom-4 right-4 w-96 shadow-xl z-[9999]">
      <CardHeader>
        <CardTitle className="text-lg">Cache Monitor</CardTitle>
        <CardDescription className="text-slate-400">Development & Debugging Panel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-semibold mb-1 text-base text-slate-300">In-Memory Cache (React Query)</h4>
          <StatItem label="Total Queries" value={stats?.inMemory?.totalQueries} isLoading={isLoading} />
        </div>
        <div>
          <h4 className="font-semibold mb-1 text-base text-slate-300">Persisted Cache (LocalForage - REACT_QUERY_OFFLINE_CACHE)</h4>
          <StatItem label="Exists" value={stats?.persisted?.exists ? 'Yes' : 'No'} isLoading={isLoading} />
          <StatItem label="Size" value={formatBytes(stats?.persisted?.sizeBytes)} isLoading={isLoading} />
          <StatItem label="Last Persisted" value={formatDate(stats?.persisted?.lastPersistedTimestamp)} isLoading={isLoading} />
        </div>
         <div>
          <h4 className="font-semibold mb-1 text-base text-slate-300">LocalForage Store ('kingdom-app-react-query/query_cache')</h4>
          <StatItem label="Total Keys" value={stats?.localForageKeys?.length} isLoading={isLoading} />
          <StatItem label="Total Store Size" value={formatBytes(stats?.totalLocalForageSize)} isLoading={isLoading} />
          {stats?.localForageKeys && stats.localForageKeys.length > 0 && (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-200">Show Keys ({stats.localForageKeys.length})</summary>
              <ul className="max-h-20 overflow-y-auto bg-slate-800 p-1 rounded mt-1">
                {stats.localForageKeys.map(key => <li key={key} className="truncate" title={key}>{key}</li>)}
              </ul>
            </details>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading} className="border-slate-600 hover:bg-slate-700">
          <LoaderIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearInMemoryCache} 
            disabled={isLoading} 
            className="text-amber-400 border-amber-500 hover:border-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Clear Memory
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearAllCache} disabled={isLoading}>
            <TrashIcon className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CacheMonitorPanel;
