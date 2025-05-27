
import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient, QueryCacheNotifyEvent, QueryKey } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface MonitoredQuery {
  queryKey: QueryKey;
  status: string;
  lastUpdated: string;
  dataUpdatedAt: number;
  isActive: boolean;
  isFetching: boolean;
  observersCount: number;
}

const CacheMonitorPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [queries, setQueries] = useState<MonitoredQuery[]>([]);
  const [filterKey, setFilterKey] = useState<string>('');

  const getSimplifiedQueryKey = (queryKey: QueryKey): string => {
    // Ensure queryKey is always an array before joining
    const keyArray = Array.isArray(queryKey) ? queryKey : [queryKey];
    return keyArray
      .map(k => (typeof k === 'object' ? JSON.stringify(k) : String(k)))
      .join('/');
  };


  const updateQueriesState = useCallback(() => {
    const allQueries = queryClient.getQueryCache().getAll();
    const monitoredQueries = allQueries.map(q => ({
      queryKey: q.queryKey,
      status: q.state.status,
      lastUpdated: new Date(q.state.dataUpdatedAt).toLocaleTimeString(),
      dataUpdatedAt: q.state.dataUpdatedAt,
      isActive: q.isActive(),
      isFetching: q.state.fetchStatus === 'fetching',
      observersCount: q.getObserversCount(),
    }));
    setQueries(monitoredQueries.sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt));
  }, [queryClient]);

  useEffect(() => {
    updateQueriesState();
    const unsubscribe = queryClient.getQueryCache().subscribe((event: QueryCacheNotifyEvent) => {
      if (event.type === 'updated' || event.type === 'added' || event.type === 'removed') {
        logger.log('React Query Cache Event:', event.type, 'QueryKey:', getSimplifiedQueryKey(event.query.queryKey));
        updateQueriesState();
      }
    });
    return () => unsubscribe();
  }, [queryClient, updateQueriesState]);

  const handleInvalidateQuery = (queryKey: QueryKey) => {
    logger.log(`Invalidating query: ${getSimplifiedQueryKey(queryKey)}`);
    queryClient.invalidateQueries({ queryKey });
    toast({ title: "Query Invalidated", description: `Query "${getSimplifiedQueryKey(queryKey)}" marked as stale.` });
  };

  const handleRefetchQuery = (queryKey: QueryKey) => {
    logger.log(`Refetching query: ${getSimplifiedQueryKey(queryKey)}`);
    queryClient.refetchQueries({ queryKey });
    toast({ title: "Query Refetching", description: `Attempting to refetch "${getSimplifiedQueryKey(queryKey)}".` });
  };

  const handleResetQuery = (queryKey: QueryKey) => {
    logger.log(`Resetting query: ${getSimplifiedQueryKey(queryKey)}`);
    queryClient.resetQueries({ queryKey });
    toast({ title: "Query Reset", description: `Query "${getSimplifiedQueryKey(queryKey)}" reset to initial state.` });
  };
  
  const handleRemoveQuery = (queryKey: QueryKey) => {
    logger.log(`Removing query: ${getSimplifiedQueryKey(queryKey)}`);
    queryClient.getQueryCache().remove(queryClient.getQueryCache().find({queryKey})!); // Using ! as find should return a query
    updateQueriesState(); // Manually update state after removal
    toast({ title: "Query Removed", description: `Query "${getSimplifiedQueryKey(queryKey)}" removed from cache.` });
  };

  const filteredQueries = queries.filter(q => 
    getSimplifiedQueryKey(q.queryKey).toLowerCase().includes(filterKey.toLowerCase())
  );

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border shadow-xl rounded-lg p-4 w-full max-w-md max-h-[50vh] flex flex-col z-50">
      <h3 className="text-lg font-semibold mb-2 text-card-foreground">React Query Cache Monitor</h3>
      <input
        type="text"
        placeholder="Filter by query key..."
        className="w-full p-2 mb-2 border border-input rounded-md bg-background text-foreground focus:ring-ring focus:border-ring"
        value={filterKey}
        onChange={(e) => setFilterKey(e.target.value)}
      />
      <ScrollArea className="flex-grow">
        {filteredQueries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No queries match filter or cache is empty.</p>
        ) : (
          <ul className="space-y-2">
            {filteredQueries.map(q => (
              <li key={getSimplifiedQueryKey(q.queryKey)} className="p-2 border border-border/50 rounded-md bg-background hover:bg-muted/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-mono truncate text-foreground" title={getSimplifiedQueryKey(q.queryKey)}>
                    {getSimplifiedQueryKey(q.queryKey)}
                  </span>
                  <div className="space-x-1">
                    <Badge variant={q.isActive ? 'default' : 'secondary'}>{q.isActive ? 'Active' : 'Inactive'}</Badge>
                    <Badge variant={q.isFetching ? 'destructive' : 'outline'}>{q.isFetching ? 'Fetching' : 'Idle'}</Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Status: {q.status} | Last Updated: {q.lastUpdated} | Observers: {q.observersCount}
                </div>
                <div className="flex space-x-1">
                  <Button size="xs" variant="outline" onClick={() => handleInvalidateQuery(q.queryKey)}>Invalidate</Button>
                  <Button size="xs" variant="outline" onClick={() => handleRefetchQuery(q.queryKey)}>Refetch</Button>
                  <Button size="xs" variant="outline" onClick={() => handleResetQuery(q.queryKey)}>Reset</Button>
                  <Button size="xs" variant="destructive" onClick={() => handleRemoveQuery(q.queryKey)}>Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
       <Button size="sm" variant="ghost" className="mt-2 text-muted-foreground" onClick={updateQueriesState}>
        Manual Refresh List
      </Button>
    </div>
  );
};

export default CacheMonitorPanel;
