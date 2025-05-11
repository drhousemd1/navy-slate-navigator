
# Centralized Data Architecture

This folder contains the central data management logic for the application. The main goal of this architecture is to ensure that:

1. All query and mutation logic lives in shared files inside `/src/data/`
2. Pages and components may NOT use useQuery, useMutation, queryClient, or Supabase directly
3. Each user action (complete, create, buy, redeem, reorder) uses a named mutation hook
4. The centralized sync manager updates ONLY the touched card (not all cards)
5. A local cache using IndexedDB ensures pages load instantly
6. Query hooks use initialData from IndexedDB
7. Pages are never stuck in a loading state due to live fetches

## Directory Structure

- `/queries/`: Contains all query hooks that fetch data from the server
- `/mutations/`: Contains all mutation hooks that make changes to the server
- `/sync/`: Contains logic for syncing data between the client and server
- `/indexedDB/`: Contains logic for caching data locally
- `/hooks/`: Contains high-level data hooks that pages/components should use

## Usage Guidelines

### DO NOT:
- Import useQuery or useMutation directly in components or pages
- Make direct Supabase calls outside of this folder
- Manage cache manually outside of these hooks
- Show loading states when data can be loaded from cache

### DO:
- Import hooks from this folder like `useTasksData()` in your components/pages
- Use the provided mutation functions like `saveTask()`, `buyReward()`, etc.
- Let the central hooks handle caching, syncing, and error handling

## Adding New Features

When adding a new domain/entity:

1. Create a query hook in `/queries/` to fetch data
2. Create mutation hooks in `/mutations/` for each action (create, update, delete, etc.)
3. Create a data hook in `/hooks/` that uses the query and mutation hooks
4. Export the data hook from `index.ts`
5. Add cache functions in `/indexedDB/useIndexedDB.ts`

## Components and Pages

Components and pages should:
- Import only the matching hook (e.g., `useTasksData()`)
- Use the data and functions provided by the hook
- Never implement data fetch/mutation logic themselves
- Show placeholder content from cache while data loads

This architecture ensures consistent, maintainable data management across the application.
