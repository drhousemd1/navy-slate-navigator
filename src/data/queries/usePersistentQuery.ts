
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";

export function usePersistentQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends unknown[] = unknown[]
>(
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'onSuccess'> & {
    onSuccess?: (data: TData) => void;
  }
): UseQueryResult<TData, TError> {
  const keyString = JSON.stringify(options.queryKey);
  const stored =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(keyString) || "null")
      : null;

  // Extract onSuccess from our options to avoid TypeScript errors
  const { onSuccess: userOnSuccess, ...restOptions } = options;

  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    initialData: stored ?? undefined,
    ...restOptions,
    meta: {
      ...restOptions.meta,
      persistSuccessData: true,
      keyString
    },
    gcTime: restOptions.gcTime || 1000 * 60 * 30,
    select: (data) => {
      // Persist data when we receive it
      if (typeof window !== "undefined" && data) {
        try {
          localStorage.setItem(keyString, JSON.stringify(data));
        } catch (e) {
          console.warn("Failed to persist query data to localStorage:", e);
        }
      }
      
      // Apply any user-defined select transformation, or return data as is
      const transformedData = restOptions.select ? restOptions.select(data) : data as unknown as TData;
      
      // Call the user's onSuccess if provided
      if (userOnSuccess) {
        setTimeout(() => userOnSuccess(transformedData), 0);
      }
      
      // Return the data (transformed or not)
      return transformedData;
    }
  });
}
