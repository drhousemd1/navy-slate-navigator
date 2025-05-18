import { QueryClient, QueryKey, Query, Mutation, QueryCache, MutationCache, useMutation, UseMutationOptions } from '@tanstack/react-query';
import localforage from "localforage";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

// Version identifier for cache invalidation with the persister
export const APP_CACHE_VERSION = '1.0.1'; // Incremented version

// Create a centralized QueryClient with optimized settings for persistence
export const createQueryClient = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error: Error, query: Query<unknown, Error, unknown, QueryKey>) => {
        console.error(
          `[Query Cache Error] Query Key: ${JSON.stringify(query.queryKey)} \nError:`,
          error
        );
        // Here, you could add more sophisticated error telemetry if needed in the future,
        // e.g., sending to an external logging service.
      },
    }),
    mutationCache: new MutationCache({
      onError: (error: Error, variables: unknown, context: unknown, mutation: Mutation<unknown, Error, unknown, unknown>) => {
        console.error(
          `[Mutation Cache Error] Mutation Key: ${JSON.stringify(mutation.options.mutationKey || 'N/A')} \nVariables: ${JSON.stringify(variables)} \nError:`,
          error,
          "\nContext:", context
        );
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: Infinity,    // Data is fresh indefinitely, relies on manual invalidation or buster
        gcTime: 1000 * 60 * 60, // Garbage collect after 1 hour of inactivity
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Components will use cached data first
        refetchOnReconnect: false,
        retry: 3, // Increased retry attempts for better recovery
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        networkMode: 'online', // Default to online, persister handles offline for queries if configured
      },
      mutations: {
        networkMode: 'offlineFirst', // Queue mutations when offline
        retry: 3, // Increased retry attempts for mutations as well
        // Global onError for mutations is now handled by mutationCache
      },
    },
  });

  return queryClient;
};

// Standardized query config that can be used across pages if specific overrides are needed
// Note: The defaults in createQueryClient are now very similar to this.
export const STANDARD_QUERY_CONFIG = {
  staleTime: Infinity,
  gcTime: 1000 * 60 * 60, // 1 hour
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

// Helper function to purge the cache manually (useful for development or user actions)
export const purgeQueryCache = async (queryClient: QueryClient) => {
  queryClient.clear(); // Clears in-memory cache
  // The persister handles clearing persisted storage based on buster or manual clear of localforage
  await localforage.removeItem('REACT_QUERY_OFFLINE_CACHE'); // Default key for react-query-persist-client
  // Or, if a custom persister key is used, clear that.
  // For a full clear if unsure about the key: await localforage.clear();
  console.log('Query cache (in-memory and persisted via localforage) purged manually');
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
  
  if (duration > 300) {
    console.warn(`[${operationName}] Operation was slow: ${duration.toFixed(2)}ms`);
  }
};

// Helper functions for direct cache updates (optimistic updates)
export const updateCacheItem = <T extends { id: string | number }>( // Adjusted for number IDs too
  queryClient: QueryClient,
  queryKey: unknown[],
  updatedItem: T
) => {
  queryClient.setQueryData<T[]>(queryKey, (oldData = []) => {
    return oldData.map(item => (item.id === updatedItem.id ? updatedItem : item));
  });
};

export const addCacheItem = <T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  newItem: T
) => {
  queryClient.setQueryData<T[]>(queryKey, (oldData = []) => {
    // Ensure newItem is not undefined or null before adding
    return newItem ? [newItem, ...oldData] : oldData;
  });
};

export const removeCacheItem = <T extends { id: string | number }>( // Adjusted for number IDs
  queryClient: QueryClient,
  queryKey: unknown[],
  itemId: string | number
) => {
  queryClient.setQueryData<T[]>(queryKey, (oldData = []) => {
    return oldData.filter(item => item.id !== itemId);
  });
};

// --- Standardized Optimistic Mutation Hooks ---

interface OptimisticMutationContext<TItem> {
  previousData?: TItem[];
  optimisticId?: string; // For create operations
  previousHistoryData?: any[]; // For related data like history in delete operations
}

/**
 * Hook for creating an item with optimistic updates.
 * @param queryClient - The QueryClient instance.
 * @param queryKey - The query key for the list of items.
 * @param mutationFn - Async function to create the item on the server, should return the created item.
 * @param entityName - Name of the entity for toast messages (e.g., "Task").
 * @param createOptimisticItem - Function to generate the optimistic item structure before server confirmation.
 *                               It should assign a temporary ID (e.g., using uuidv4).
 * @param idField - The name of the ID field in TItem (default: 'id').
 * @param onSuccessCallback - Optional callback after successful creation and cache update.
 * @param mutationOptions - Additional options for useMutation.
 */
export function useCreateOptimisticMutation<
  TItem extends Record<string, any> & { id: string | number }, // Item being created
  TError extends Error,
  TVariables, // Variables for mutationFn, usually Partial<TItem> without id
  TContext extends OptimisticMutationContext<TItem> = OptimisticMutationContext<TItem>
>(options: {
  queryClient: QueryClient;
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TItem>;
  entityName: string;
  createOptimisticItem: (variables: TVariables, optimisticId: string) => TItem;
  idField?: keyof TItem;
  onSuccessCallback?: (data: TItem, variables: TVariables) => void;
  mutationOptions?: Omit<UseMutationOptions<TItem, TError, TVariables, TContext>, 'mutationFn' | 'onMutate' | 'onError' | 'onSuccess' | 'onSettled'>;
}) {
  const { 
    queryClient, 
    queryKey, 
    mutationFn, 
    entityName, 
    createOptimisticItem, 
    idField = 'id' as keyof TItem, 
    onSuccessCallback,
    mutationOptions
  } = options;

  return useMutation<TItem, TError, TVariables, TContext>({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);
      
      const optimisticId = uuidv4();
      const optimisticItem = createOptimisticItem(variables, optimisticId);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) => [optimisticItem, ...old]);
      
      return { previousData, optimisticId } as TContext;
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previousData);
      }
      toast({ title: `Error creating ${entityName}`, description: err.message, variant: 'destructive' });
    },
    onSuccess: (data, variables, context) => { // data is the actual item from server
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) => {
        const filteredList = old.filter(item => !(context?.optimisticId && item[idField] === context.optimisticId));
        return [data, ...filteredList];
      });
      toast({ title: `${entityName} created successfully!` });
      if (onSuccessCallback) {
        onSuccessCallback(data, variables);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    ...mutationOptions,
  });
}

/**
 * Hook for updating an item with optimistic updates.
 * @param idField - The name of the ID field in TItem (default: 'id').
 */
export function useUpdateOptimisticMutation<
  TItem extends Record<string, any> & { id: string | number },
  TError extends Error,
  TVariables extends { id: string | number } & Partial<Omit<TItem, 'id'>>, // TVariables must have an 'id' property with the ID value
  TContext extends OptimisticMutationContext<TItem> = OptimisticMutationContext<TItem>
>(options: {
  queryClient: QueryClient;
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TItem>;
  entityName: string;
  idField?: keyof TItem; // This is the name of the ID field in TItem objects (e.g., in cache)
  onSuccessCallback?: (data: TItem, variables: TVariables) => void;
  mutationOptions?: Omit<UseMutationOptions<TItem, TError, TVariables, TContext>, 'mutationFn' | 'onMutate' | 'onError' | 'onSuccess' | 'onSettled'>;
}) {
  const { 
    queryClient, 
    queryKey, 
    mutationFn, 
    entityName, 
    idField = 'id' as keyof TItem, 
    onSuccessCallback,
    mutationOptions
  } = options;

  return useMutation<TItem, TError, TVariables, TContext>({
    mutationFn,
    onMutate: async (variables: TVariables) => { // variables.id is the ID of the item to update
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map(item =>
          // Compare the item's ID (using idField) with variables.id (the ID passed for update)
          item[idField] === variables.id 
            ? { ...item, ...variables, updated_at: new Date().toISOString() } as TItem // Assumes updated_at field
            : item
        )
      );
      return { previousData } as TContext;
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previousData);
      }
      toast({ title: `Error updating ${entityName}`, description: err.message, variant: 'destructive' });
    },
    onSuccess: (data, variables, _context) => { // data is the actual item from server
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        // Use data[idField] to ensure we're matching based on the TItem's structure after server confirmation
        // Assuming 'data' (the server response) also uses 'idField' for its primary key.
        // If server response 'data' always uses 'id', then data.id might be more consistent here.
        // For now, assuming data structure mirrors TItem regarding idField.
        old.map(item => (item[idField] === data[idField as keyof TItem] ? data : item))
      );
      toast({ title: `${entityName} updated successfully!` });
      if (onSuccessCallback) {
        onSuccessCallback(data, variables);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    ...mutationOptions,
  });
}

/**
 * Hook for deleting an item with optimistic updates.
 * @param idField - The name of the ID field in TItem (default: 'id').
 * @param relatedQueryKey - Optional query key for related data that also needs optimistic update (e.g., history).
 * @param relatedIdField - Optional ID field name in the related data items to match against the main item's ID.
 */
export function useDeleteOptimisticMutation<
  TItem extends Record<string, any> & { id: string | number },
  TError extends Error,
  TVariables extends string | number, // ID of the item to delete
  TContext extends OptimisticMutationContext<TItem> = OptimisticMutationContext<TItem>
>(options: {
  queryClient: QueryClient;
  queryKey: unknown[];
  mutationFn: (id: TVariables) => Promise<void>;
  entityName: string;
  idField?: keyof TItem;
  onSuccessCallback?: (id: TVariables) => void;
  relatedQueryKey?: unknown[]; 
  relatedIdField?: string; // e.g., 'punishment_id' in history item to link to TItem's id
  mutationOptions?: Omit<UseMutationOptions<void, TError, TVariables, TContext>, 'mutationFn' | 'onMutate' | 'onError' | 'onSuccess' | 'onSettled'>;
}) {
  const { 
    queryClient, 
    queryKey, 
    mutationFn, 
    entityName, 
    idField = 'id' as keyof TItem, 
    onSuccessCallback,
    relatedQueryKey,
    relatedIdField,
    mutationOptions
  } = options;

  return useMutation<void, TError, TVariables, TContext>({
    mutationFn,
    onMutate: async (idToDelete: TVariables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);
      
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.filter(item => item[idField] !== idToDelete)
      );

      let previousHistoryData: any[] | undefined;
      if (relatedQueryKey && relatedIdField) {
        await queryClient.cancelQueries({queryKey: relatedQueryKey});
        previousHistoryData = queryClient.getQueryData<any[]>(relatedQueryKey);
        queryClient.setQueryData<any[]>(relatedQueryKey, (oldRelated = []) => 
          oldRelated.filter(item => item[relatedIdField] !== idToDelete)
        );
      }
      
      return { previousData, previousHistoryData } as TContext;
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previousData);
      }
      if (context?.previousHistoryData && relatedQueryKey) {
        queryClient.setQueryData<any[]>(relatedQueryKey, context.previousHistoryData);
      }
      toast({ title: `Error deleting ${entityName}`, description: err.message, variant: 'destructive' });
    },
    onSuccess: (_data, idDeleted, _context) => {
      toast({ title: `${entityName} deleted successfully!` });
      if (onSuccessCallback) {
        onSuccessCallback(idDeleted);
      }
      // Persisting to IndexedDB would typically happen here or in onSuccessCallback if needed globally.
      // For now, the specific data hooks (like usePunishmentsData) handle IndexedDB persistence.
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      if (relatedQueryKey) {
        queryClient.invalidateQueries({ queryKey: relatedQueryKey });
      }
    },
    ...mutationOptions,
  });
}

// The useCachedQuery helper is less relevant when global staleTime is Infinity
// and persistence is handled by PersistQueryClientProvider.
// It can be removed or adapted if specific prefetch-and-return-cached logic is still needed.
// For now, removing it to simplify and rely on PersistQueryClientProvider.
// // ... keep existing code (useCachedQuery function)
