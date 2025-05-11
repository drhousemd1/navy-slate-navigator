
# Centralized Data Architecture

This directory contains all data-related logic for the application. The architecture is designed to ensure that:

1. All data fetching, mutations, and sync operations are centralized
2. Components and pages are kept clean of data logic
3. Data is cached locally using IndexedDB
4. Sync operations are optimized to minimize network requests

## Directory Structure

- `/queries/` - React Query hooks for fetching data
- `/mutations/` - React Query hooks for modifying data
- `/sync/` - Sync manager for coordinating data synchronization
- `/indexedDB/` - Utilities for local data persistence
- `/interfaces/` - TypeScript interfaces for data models

## Usage Guidelines

### ❌ NEVER DO THIS:

- Import `supabase` directly in components or pages
- Use `useQuery` or `useMutation` outside of this directory
- Implement data fetching logic in components
- Duplicate data access patterns

### ✅ ALWAYS DO THIS:

- Import hooks from this directory (e.g., `useAdminCards`, `useTasks`)
- Use the `syncCardById` function after mutations
- Store data in IndexedDB for offline capabilities
- Update React Query cache optimistically when possible

## Adding New Data Types

When adding a new data type:

1. Create a new query hook in `/queries/`
2. Create mutation hooks in `/mutations/`
3. Add IndexedDB functions in `/indexedDB/useIndexedDB.ts`
4. Update `useSyncManager.ts` to handle the new type
5. Add appropriate interfaces in `/interfaces/`

## Sync Manager

The sync manager (`useSyncManager.ts`) provides:

- Individual card syncing with `syncCardById`
- Batch synchronization with `syncNow`
- Background sync with configurable intervals

## IndexedDB Caching

All data is cached in IndexedDB for:

- Instant loading on repeated visits
- Offline capabilities
- Reduced server load

## Implementation Notes

- All API calls should use optimistic updates
- Query invalidations should be targeted (avoid full cache invalidation)
- Error states should fallback to cached data when possible
- Components should never know about the data source (API vs cache)

## Important Warning

**DO NOT REPLICATE THIS LOGIC OUTSIDE /src/data/**

All fetching, mutations, syncs, and caching must route through centralized hooks only.
This ensures consistent data handling, optimized network usage, and maintainable code.
