
# Data Management System

## Purpose
This folder contains the centralized data management system that handles all interactions with remote and local data stores. It's designed to provide consistent query and mutation patterns, minimize network requests, and maintain a responsive UI with local caching.

## Architecture
The data system is structured into these key areas:

### `/queries`
Contains React Query hooks for fetching and caching data from Supabase and local storage.
- Each hook follows the pattern `use[EntityName]` (e.g., `useTasks`, `useRules`)
- Queries automatically integrate with IndexedDB for offline support

### `/mutations`
Contains mutation hooks for updating data, both locally and remotely.
- Each hook follows the pattern `use[Operation][EntityName]` (e.g., `useCompleteTask`, `useCreateRule`)
- Mutations update the UI immediately via optimistic updates
- They sync with the backend without requiring full refetches

### `/indexedDB`
Provides local storage capabilities using localforage.
- Implements save and load functions for each entity type
- Ensures data is available even when offline
- Acts as a performance accelerator for faster initial page loads

### `/sync`
Manages intelligent synchronization between client and server.
- The `useSyncManager` hook provides controlled synchronization
- `syncCardById` enables targeting specific items for sync rather than entire tables
- Helps minimize unnecessary network requests

## Usage Guidelines

### For Fetching Data
```typescript
// ✅ Correct pattern
import { useTasks } from '@/data/queries/useTasks';

function TasksPage() {
  const { tasks, isLoading, error } = useTasks();
  // Use tasks data in the UI...
}
```

### For Updating Data
```typescript
// ✅ Correct pattern
import { useCompleteTask } from '@/data/mutations/useCompleteTask';

function TaskItem({ task }) {
  const completeTask = useCompleteTask();
  
  const handleComplete = async () => {
    await completeTask.mutateAsync(task.id);
    // UI is already updated optimistically, no refetch needed
  };
}
```

### Prohibited Patterns
```typescript
// ❌ DO NOT DO THIS - Don't use useQuery or useMutation directly in components
// Don't access Supabase directly in components
// Don't implement your own IndexedDB logic outside this folder
```

## Adding New Data Domains

To add a new data domain (e.g., Journals):

1. Add query hook in `/queries/useJournals.ts`
2. Add corresponding IndexedDB functions in `/indexedDB/useIndexedDB.ts`
3. Add mutation hooks in `/mutations/useCreateJournal.ts`, etc.
4. Update the sync manager to include the new domain

Follow the existing patterns closely to maintain consistency.
