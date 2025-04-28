
import { QueryClient } from '@tanstack/react-query';

// Create a centralized QueryClient with optimized settings
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30,   // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,     // Changed from true to false
        retry: 1,
        networkMode: 'online',
      },
      mutations: {
        networkMode: 'online',
        retry: 1,
      },
    },
  });
};

// Standardized query config that can be used across the app
export const STANDARD_QUERY_CONFIG = {
  staleTime: 1000 * 60 * 5,  // 5 minutes
  gcTime: 1000 * 60 * 30,    // 30 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,      // Changed from true to false
  retry: 1,
};

// Centralized helper for performance logging
export const logQueryPerformance = (
  operationName: string,
  startTime: number,
  dataLength?: number
) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(
    `[${operationName}] Operation completed in ${duration.toFixed(2)}ms` + 
    (dataLength !== undefined ? `, returned ${dataLength} items` : '')
  );
  
  // Log warnings for slow operations
  if (duration > 300) {
    console.warn(`[${operationName}] Operation was slow: ${duration.toFixed(2)}ms`);
  }
};
