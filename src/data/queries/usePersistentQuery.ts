
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export function usePersistentQuery<TData>(
  options: UseQueryOptions<TData, Error>
) {
  const keyString = JSON.stringify(options.queryKey);
  const stored =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(keyString) || "null")
      : null;

  return useQuery<TData, Error>({
    initialData: stored ?? undefined,
    ...options,
  });
}
