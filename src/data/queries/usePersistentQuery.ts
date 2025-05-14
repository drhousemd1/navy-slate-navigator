
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";

export function usePersistentQuery<TData>(
  options: UseQueryOptions<TData, Error>
): UseQueryResult<TData, Error> {
  const keyString = JSON.stringify(options.queryKey);
  const stored =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(keyString) || "null")
      : null;

  return useQuery<TData, Error>({
    initialData: stored ?? undefined,
    ...options,
    meta: {
      ...(options.meta || {}),
    },
    onSuccess: (data: TData) => {
      if (typeof window !== "undefined" && data) {
        try {
          localStorage.setItem(keyString, JSON.stringify(data));
        } catch (e) {
          console.warn("Failed to persist query data to localStorage:", e);
        }
      }
      
      // Call the original onSuccess if it exists
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    }
  });
}
