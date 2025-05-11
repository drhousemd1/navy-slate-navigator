
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { QueryClient } from '@tanstack/react-query';

// Standard configuration for all queries
export const STANDARD_QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: true,
  refetchOnMount: true,
  refetchOnReconnect: true,
  retry: 1
};

// Helper to log performance of query operations
export const logQueryPerformance = (queryName: string, startTime: number, itemCount?: number) => {
  const endTime = performance.now();
  console.log(`[${queryName}] Operation completed in ${(endTime - startTime).toFixed(2)}ms, fetched ${itemCount || 'unknown'} items`);
};
