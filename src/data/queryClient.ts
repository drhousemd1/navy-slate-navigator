
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

// import { QueryClient } from "@tanstack/react-query"; // No longer directly import QueryClient here
import { createQueryClient } from "@/lib/react-query-config"; // Import our factory

export const queryClient = createQueryClient(); // Initialize using our configured factory

// The old defaultOptions are now handled within createQueryClient
// defaultOptions: {
//   queries: {
//     staleTime: Infinity,
//     gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
//     refetchOnWindowFocus: false,
//     refetchOnMount: false,
//     refetchOnReconnect: false,
//   },
// },

