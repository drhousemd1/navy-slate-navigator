
# App Code Guide

## ⚠️ CRITICAL: READ BEFORE MAKING ANY CHANGES

This application follows strict architectural patterns that have been carefully designed and tested. **DO NOT** modify the core data flow patterns without understanding the full system architecture.

## Architecture Contract

This app uses a dual-layer caching strategy with IndexedDB + React Query for optimal performance and offline capability. Each page follows a specific pattern that must be maintained.

### Page Architecture Overview

```typescript
// architectureContract.tsx
export interface PageConfig {
  page: string;
  dataHook: string;
  cacheStrategy: string;
  syncInterval: string;
  reactQueryConfig: {
    staleTime: string;
    refetchOnWindowFocus: boolean;
    refetchOnReconnect: boolean;
    refetchOnMount: boolean;
    gcTime: string;
    retry: number;
    retryDelay: string;
  };
  mutations: string[];
  uiWrapping: string;
}

export const architectureContract: PageConfig[] = [
  {
    page: "Tasks",
    dataHook: "useTasksData (src/hooks/useTasksData.ts) → useTasksQuery (src/data/tasks/queries.ts)",
    cacheStrategy:
      "loadTasksFromDB(); getLastSyncTimeForTasks() < 30min && localData.length > 0 skip network; else fetchTasks() → saveTasksToDB() + setLastSyncTimeForTasks()",
    syncInterval: "30 minutes",
    reactQueryConfig: {
      staleTime: "Infinity",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      gcTime: "1 hour",
      retry: 3,
      retryDelay: "exponential",
    },
    mutations: [
      "useCreateTask",
      "useUpdateTask",
      "useDeleteTask",
      "useToggleTaskCompletionMutation",
    ],
    uiWrapping:
      "<AppLayout> + <RewardsProvider>, <ErrorBoundary>, isLoading, error, <EmptyState>, <TasksList>, listens for 'add-new-task' event to open <TaskEditor>",
  },
  {
    page: "Rules",
    dataHook: "useRulesData (src/data/hooks/useRulesData.ts) → useRules (src/data/rules/queries.ts)",
    cacheStrategy:
      "loadRulesFromDB(); getLastSyncTimeForRules() < 30min skip network; else fetchRulesFromServer() → saveRulesToDB() + setLastSyncTimeForRules(); on error use localData",
    syncInterval: "30 minutes",
    reactQueryConfig: {
      staleTime: "Infinity",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      gcTime: "30 minutes",
      retry: 3,
      retryDelay: "exponential",
    },
    mutations: [
      "useCreateRule",
      "useUpdateRule",
      "useDeleteRule",
      "useCreateRuleViolation",
    ],
    uiWrapping:
      "<AppLayout>, <ErrorBoundary>, isLoading, error, <RulesList>, listens for 'add-new-rule' event to open <RuleEditor>",
  },
  {
    page: "Rewards",
    dataHook: "useRewards (src/data/queries/useRewards.ts)",
    cacheStrategy:
      "loadRewardsFromDB(); getLastSyncTimeForRewards() < 30min && localData.length > 0 skip network; else fetchRewards() → saveRewardsToDB() + setLastSyncTimeForRewards(); on error use localData",
    syncInterval: "30 minutes",
    reactQueryConfig: {
      staleTime: "Infinity",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      gcTime: "30 minutes",
      retry: 1,
      retryDelay: "exponential",
    },
    mutations: [
      "useCreateRewardMutation",
      "useUpdateRewardMutation",
      "useDeleteRewardMutation",
      "useBuySubReward",
      "useRedeemSubReward",
    ],
    uiWrapping:
      "<AppLayout>, <ErrorBoundary>, <AuthContext>, <PointsManager>, <RewardsList>, <RewardEditor>, header add button opens editor",
  },
  {
    page: "Punishments",
    dataHook:
      "usePunishmentsQuery (src/data/punishments/queries/usePunishmentsQuery.ts) → fetchPunishments() (src/data/punishments/queries/fetchPunishments.ts)",
    cacheStrategy:
      "loadPunishmentsFromDB(); getLastSyncTimeForPunishments() < 30min && localData.length > 0 skip network; else fetchPunishments() → savePunishmentsToDB() + setLastSyncTimeForPunishments(); on error use localData",
    syncInterval: "30 minutes",
    reactQueryConfig: {
      staleTime: "Infinity",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      gcTime: "1 hour",
      retry: 1,
      retryDelay: "exponential",
    },
    mutations: [
      "useCreatePunishment",
      "useUpdatePunishment",
      "useDeletePunishment",
    ],
    uiWrapping:
      "<AppLayout>, <ErrorBoundary>, <PunishmentList>, listens for 'add-new-punishment' event to open <PunishmentEditor>",
  },
];
```

## Critical System Components

### 1. IndexedDB Dual-Layer Caching System

**Location**: `src/data/indexedDB/useIndexedDB.ts`

**Purpose**: Provides offline-first data persistence with automatic sync management.

**Key Functions**:
- `loadXFromDB()` - Load cached data
- `saveXToDB()` - Save data to cache
- `getLastSyncTimeForX()` - Check when data was last synced
- `setLastSyncTimeForX()` - Update sync timestamp

**⚠️ DO NOT MODIFY** these functions without understanding the full sync strategy.

### 2. React Query Configuration

All pages use consistent React Query settings:

```typescript
{
  staleTime: Infinity,        // Data never goes stale automatically
  refetchOnWindowFocus: false, // No automatic refetching
  refetchOnReconnect: false,   // No automatic refetching
  refetchOnMount: false,       // Rely on cache first
  gcTime: "30min-1hour",       // Garbage collection time varies
  retry: 1-3,                  // Retry attempts vary by page
  retryDelay: "exponential"    // Exponential backoff
}
```

**⚠️ DO NOT CHANGE** these settings without updating all pages consistently.

### 3. Data Fetching Pattern

Every page follows this exact pattern:

```typescript
export const fetchX = async (): Promise<X[]> => {
  const localData = await loadXFromDB();
  const lastSync = await getLastSyncTimeForX();
  let shouldFetchFromServer = true;

  // Check if we can use cached data (30 min threshold)
  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync).getTime();
    if (timeDiff < 1000 * 60 * 30 && localData && localData.length > 0) {
      shouldFetchFromServer = false;
    }
  } else if (localData && localData.length > 0) {
    shouldFetchFromServer = false;
  }

  if (!shouldFetchFromServer && localData) {
    return localData; // Return cached data
  }

  // Fetch from server
  try {
    const { data, error } = await supabase.from('table').select('*');
    if (error) throw error;
    
    if (data) {
      await saveXToDB(data);
      await setLastSyncTimeForX(new Date().toISOString());
      return data;
    }
    return localData || [];
  } catch (error) {
    // Fallback to cached data on error
    if (localData) return localData;
    throw error;
  }
};
```

**⚠️ DO NOT MODIFY** this pattern. It ensures consistent offline capability.

### 4. Mutation Patterns

#### Standard CRUD Mutations
All pages use optimistic mutations with automatic IndexedDB sync:

```typescript
const useCreateX = () => {
  return useCreateOptimisticMutation({
    queryClient,
    queryKey: X_QUERY_KEY,
    mutationFn: async (variables) => {
      const { data, error } = await supabase.from('table').insert(variables);
      if (error) throw error;
      return data;
    },
    entityName: 'Entity',
    onSuccessCallback: async (newData) => {
      // Update IndexedDB
      const localData = await loadXFromDB() || [];
      const updatedData = [newData, ...localData];
      await saveXToDB(updatedData);
      await setLastSyncTimeForX(new Date().toISOString());
    },
  });
};
```

#### Special Task Completion Mutation
Tasks have a unique completion system that tracks usage data:

```typescript
const useToggleTaskCompletionMutation = () => {
  // Complex completion logic with points, usage tracking, etc.
  // DO NOT MODIFY without understanding the full system
};
```

### 5. UI Wrapping Patterns

Each page follows a specific component hierarchy:

#### Tasks Page Structure
```typescript
<AppLayout onAddNewItem={handleAddNewItem}>
  <RewardsProvider>
    <ErrorBoundary fallbackMessage="...">
      <TasksPageContent>
        <TasksHeader />
        {loading ? <LoadingState /> : 
         error ? <ErrorDisplay /> :
         empty ? <EmptyState /> :
         <TasksList />}
        <TaskEditor />
      </TasksPageContent>
    </ErrorBoundary>
  </RewardsProvider>
</AppLayout>
```

#### Other Pages Structure
```typescript
<AppLayout onAddNewItem={handleAddNewItem}>
  <ErrorBoundary fallbackMessage="...">
    <PageContent>
      <PageHeader />
      <PageList />
      <PageEditor />
    </PageContent>
  </ErrorBoundary>
</AppLayout>
```

### 6. Event System

Pages use custom events for cross-component communication:

```typescript
// Dispatching events
const handleAddNewItem = () => {
  const contentElement = document.querySelector('.PageContent');
  if (contentElement) {
    const event = new CustomEvent('add-new-item');
    contentElement.dispatchEvent(event);
  }
};

// Listening for events
useEffect(() => {
  const element = document.querySelector('.PageContent');
  if (element) {
    const handleAddEvent = () => setIsEditorOpen(true);
    element.addEventListener('add-new-item', handleAddEvent);
    return () => element.removeEventListener('add-new-item', handleAddEvent);
  }
}, []);
```

## 🚨 CRITICAL RULES - NEVER BREAK THESE

### 1. IndexedDB Functions
- **NEVER** modify functions in `src/data/indexedDB/useIndexedDB.ts`
- **NEVER** change the 30-minute sync threshold
- **NEVER** remove the fallback-to-cache-on-error logic

### 2. React Query Configuration
- **NEVER** change `staleTime: Infinity`
- **NEVER** enable `refetchOnWindowFocus`, `refetchOnReconnect`, or `refetchOnMount`
- **NEVER** modify retry/gcTime without updating all pages

### 3. Data Flow
- **NEVER** bypass the IndexedDB caching layer
- **NEVER** call Supabase directly from UI components
- **NEVER** modify the dual-layer caching strategy

### 4. Task Completion System
- **NEVER** simplify the task completion logic without understanding points/usage tracking
- **NEVER** remove optimistic updates from task operations
- **NEVER** modify `useToggleTaskCompletionMutation` without full system understanding

### 5. Error Handling
- **NEVER** remove try/catch blocks in data fetching
- **NEVER** remove fallback to cached data on errors
- **NEVER** change the error boundary structure

### 6. Mutation Callbacks
- **NEVER** remove `onSuccessCallback` from mutations
- **NEVER** skip IndexedDB updates in mutation success handlers
- **NEVER** remove sync time updates

## Troubleshooting Common Issues

### "Data not loading"
1. Check if IndexedDB functions are working
2. Verify 30-minute sync logic
3. Check React Query cache status
4. Ensure error fallbacks are intact

### "Mutations not working"
1. Verify `onSuccessCallback` is updating IndexedDB
2. Check if `entityName` is provided for optimistic mutations
3. Ensure sync timestamps are being updated

### "Offline mode broken"
1. Verify IndexedDB caching is functioning
2. Check if fallback-to-cache logic is intact
3. Ensure error handling preserves cached data

### "Performance issues"
1. Check if React Query settings match the contract
2. Verify IndexedDB operations aren't being called excessively
3. Ensure proper garbage collection times

## File Structure Reference

```
src/
├── data/
│   ├── indexedDB/useIndexedDB.ts        # 🚨 CRITICAL - DO NOT MODIFY
│   ├── tasks/
│   │   ├── queries.ts                   # fetchTasks, useTasksQuery
│   │   └── mutations/                   # All task mutations
│   ├── rules/
│   │   ├── queries.ts                   # useRules
│   │   └── mutations/                   # All rule mutations
│   ├── rewards/
│   │   └── queries/                     # useRewards
│   └── punishments/
│       └── queries/                     # usePunishmentsQuery
├── hooks/
│   └── useTasksData.ts                  # 🚨 CRITICAL - Task data wrapper
├── pages/
│   ├── Tasks.tsx                        # 🚨 CRITICAL - Complex completion logic
│   ├── Rules.tsx                        # Standard pattern
│   ├── Rewards.tsx                      # Standard pattern
│   └── Punishments.tsx                  # Standard pattern
└── lib/
    ├── optimistic-mutations.ts          # 🚨 CRITICAL - Mutation system
    └── taskUtils.ts                     # 🚨 CRITICAL - Task processing logic
```

## Summary

This application's architecture has been carefully designed for:
- **Offline-first** operation with IndexedDB caching
- **Optimistic updates** for better UX
- **Consistent error handling** with graceful fallbacks
- **Performance optimization** through intelligent caching

**Before making ANY changes**, ensure you understand how your modification fits into this architecture. When in doubt, refer to this guide and follow the established patterns exactly.

**Remember**: The complexity exists for good reasons. Simplifying without understanding the full system will break critical functionality.
