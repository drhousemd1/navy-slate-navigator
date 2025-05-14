
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";

export function usePersistentQuery<TData>(
  options: Omit<UseQueryOptions<TData, Error, TData>, 'onSuccess'> & {
    onSuccess?: (data: TData) => void;
  }
): UseQueryResult<TData, Error> {
  const keyString = JSON.stringify(options.queryKey);
  const stored =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(keyString) || "null")
      : null;

  // Extract onSuccess from our options to avoid TypeScript errors
  const { onSuccess: userOnSuccess, ...restOptions } = options;

  return useQuery<TData, Error>({
    initialData: stored ?? undefined,
    ...restOptions,
    onSuccess: (data: TData) => {
      // First persist the data
      if (typeof window !== "undefined" && data) {
        try {
          localStorage.setItem(keyString, JSON.stringify(data));
        } catch (e) {
          console.warn("Failed to persist query data to localStorage:", e);
        }
      }
      
      // Then call the user's onSuccess if provided
      if (userOnSuccess) {
        userOnSuccess(data);
      }
    }
  });
}
