import { type CacheToken, isCurrentCacheToken, requireCurrentCacheToken } from '@/data/indexedDB/useIndexedDB';
import { useMutation, UseMutationOptions, QueryClient } from '@tanstack/react-query';
import { toastManager } from '@/lib/toastManager';
import { v4 as uuidv4 } from 'uuid';

// Context for optimistic updates
export interface OptimisticMutationContext<TItem> {
  cacheToken?: CacheToken | null;
  requestQueryKey?: unknown[];
  requestRelatedKey?: unknown[];
  previousData?: TItem[];
  optimisticId?: string; // For create operations
  previousHistoryData?: Record<string, unknown>[]; // For related data like history in delete operations
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
  TItem extends { id: string | number }, // Item being created
  TError extends Error,
  TVariables, // Variables for mutationFn, usually Partial<TItem> without id
  TContext extends OptimisticMutationContext<TItem> = OptimisticMutationContext<TItem>
>(options: {
  cacheToken?: CacheToken | null;
  queryClient: QueryClient;
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TItem>;
  entityName: string;
  createOptimisticItem: (variables: TVariables, optimisticId: string) => TItem;
  idField?: keyof TItem;
  onSuccessCallback?: (data: TItem, variables: TVariables, cacheToken: CacheToken | null) => void;
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
      const cacheToken = options.cacheToken;
      if (cacheToken !== undefined) requireCurrentCacheToken(cacheToken);
      await queryClient.cancelQueries({ queryKey });
      if (cacheToken !== undefined) requireCurrentCacheToken(cacheToken);
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);

      const optimisticId = uuidv4();
      const optimisticItem = createOptimisticItem(variables, optimisticId);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) => [optimisticItem, ...old]);

      return { previousData, optimisticId, cacheToken, requestQueryKey: queryKey } as TContext;
    },
    onError: (err, _variables, context) => {
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      const queryKey = context?.requestQueryKey ?? options.queryKey;
      if (context?.previousData) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previousData);
      }
      toastManager.error(`Error creating ${entityName}`, err.message);
    },
    onSuccess: async (data, variables, context) => {
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      const queryKey = context?.requestQueryKey ?? options.queryKey;
      // Replace the optimistic item with the real one from the server
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) => {
        const withoutOptimistic = old.filter(item => !(context?.optimisticId && item[idField] === context.optimisticId));
        return [data, ...withoutOptimistic];
      });

      toastManager.success(`${entityName} created successfully!`);

      if (onSuccessCallback) {
        await onSuccessCallback(data, variables, context?.cacheToken ?? null);
      }
    },
    onSettled: async (_data, _error, _variables, context) => {
      // Small delay to ensure all operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      queryClient.invalidateQueries({ queryKey: context?.requestQueryKey ?? queryKey });
    },
    ...mutationOptions,
  });
}

/**
 * Hook for updating an item with optimistic updates.
 * @param idField - The name of the ID field in TItem (default: 'id').
 */
export function useUpdateOptimisticMutation<
  TItem extends { id: string | number },
  TError extends Error,
  TVariables extends { id: string | number } & Partial<Omit<TItem, 'id'>>, // TVariables must have an 'id' property with the ID value
  TContext extends OptimisticMutationContext<TItem> = OptimisticMutationContext<TItem>
>(options: {
  cacheToken?: CacheToken | null;
  queryClient: QueryClient;
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TItem>;
  entityName: string;
  idField?: keyof TItem; // This is the name of the ID field in TItem objects (e.g., in cache)
  onSuccessCallback?: (data: TItem, variables: TVariables, cacheToken: CacheToken | null) => void;
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
      const cacheToken = options.cacheToken;
      if (cacheToken !== undefined) requireCurrentCacheToken(cacheToken);
      await queryClient.cancelQueries({ queryKey });
      if (cacheToken !== undefined) requireCurrentCacheToken(cacheToken);
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map(item =>
          item[idField] === variables.id
            ? { ...item, ...variables, updated_at: new Date().toISOString() } as TItem // Assumes updated_at field
            : item
        )
      );
      return { previousData, cacheToken, requestQueryKey: queryKey } as TContext;
    },
    onError: (err, _variables, context) => {
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      const queryKey = context?.requestQueryKey ?? options.queryKey;
      if (context?.previousData) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previousData);
      }
      toastManager.error(`Error updating ${entityName}`, err.message);
    },
    onSuccess: async (data, variables, context) => {
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      const queryKey = context?.requestQueryKey ?? options.queryKey; // data is the actual item from server
      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.map(item => (item[idField] === data[idField as keyof TItem] ? data : item))
      );
      toastManager.success(`${entityName} updated successfully!`);
      if (onSuccessCallback) {
        await onSuccessCallback(data, variables, context?.cacheToken ?? null);
      }
    },
    onSettled: async (_data, _error, _variables, context) => {
      // Add a small delay to ensure IndexedDB operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      queryClient.invalidateQueries({ queryKey: context?.requestQueryKey ?? queryKey });
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
  TItem extends { id: string | number },
  TError extends Error,
  TVariables extends string | number, // ID of the item to delete
  TContext extends OptimisticMutationContext<TItem> = OptimisticMutationContext<TItem>
>(options: {
  cacheToken?: CacheToken | null;
  queryClient: QueryClient;
  queryKey: unknown[];
  mutationFn: (id: TVariables) => Promise<void>; // Delete typically returns void
  entityName: string;
  idField?: keyof TItem;
  onSuccessCallback?: (id: TVariables, cacheToken: CacheToken | null) => void;
  relatedQueryKey?: unknown[];
  relatedIdField?: string;
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
      const cacheToken = options.cacheToken;
      if (cacheToken !== undefined) requireCurrentCacheToken(cacheToken);
      await queryClient.cancelQueries({ queryKey });
      if (cacheToken !== undefined) requireCurrentCacheToken(cacheToken);
      const previousData = queryClient.getQueryData<TItem[]>(queryKey);

      queryClient.setQueryData<TItem[]>(queryKey, (old = []) =>
        old.filter(item => item[idField] !== idToDelete)
      );

      let previousHistoryData: Record<string, unknown>[] | undefined;
      if (relatedQueryKey && relatedIdField) {
        await queryClient.cancelQueries({queryKey: relatedQueryKey});
        if (cacheToken !== undefined) requireCurrentCacheToken(cacheToken);
        previousHistoryData = queryClient.getQueryData<Record<string, unknown>[]>(relatedQueryKey);
        queryClient.setQueryData<Record<string, unknown>[]>(relatedQueryKey, (oldRelated = []) =>
          oldRelated.filter(item => item[relatedIdField] !== idToDelete)
        );
      }

      return { previousData, previousHistoryData, cacheToken, requestQueryKey: queryKey, requestRelatedKey: relatedQueryKey } as TContext;
    },
    onError: (err, _variables, context) => {
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      const queryKey = context?.requestQueryKey ?? options.queryKey;
      if (context?.previousData) {
        queryClient.setQueryData<TItem[]>(queryKey, context.previousData);
      }
      if (context?.previousHistoryData && context.requestRelatedKey) {
        queryClient.setQueryData<Record<string, unknown>[]>(context.requestRelatedKey, context.previousHistoryData);
      }
      toastManager.error(`Error deleting ${entityName}`, err.message);
    },
    onSuccess: async (_data, idDeleted, context) => {
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      const queryKey = context?.requestQueryKey ?? options.queryKey;
      toastManager.success(`${entityName} deleted successfully!`);
      if (onSuccessCallback) {
        await onSuccessCallback(idDeleted, context?.cacheToken ?? null);
      }
    },
    onSettled: async (_data, _error, _variables, context) => {
      // Add a small delay to ensure IndexedDB operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      if (options.cacheToken !== undefined && (!context || !isCurrentCacheToken(context.cacheToken ?? null))) return;
      queryClient.invalidateQueries({ queryKey: context?.requestQueryKey ?? queryKey });
      if (context?.requestRelatedKey) {
        queryClient.invalidateQueries({ queryKey: context.requestRelatedKey });
      }
    },
    ...mutationOptions,
  });
}
