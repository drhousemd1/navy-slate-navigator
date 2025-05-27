
import { useMutation, UseMutationOptions, QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

// Context for optimistic updates
export interface OptimisticMutationContext<TItem> {
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
  mutationFn: (id: TVariables) => Promise<void>; // Delete typically returns void
  entityName: string;
  idField?: keyof TItem;
  onSuccessCallback?: (id: TVariables) => void;
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
