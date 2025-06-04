# App Code Guide

## ⚠️ CRITICAL: READ BEFORE MAKING ANY CHANGES
/**
 * OVERVIEW
 *
 * This app connects a Dominant and Submissive user in a structured behavior-tracking dynamic.
 * It enables:
 *  - Persistent RULES set by the Dominant with infraction tracking
 *  - One-time or recurring TASKS assigned to the Submissive with completion tracking
 *  - Configurable REWARDS earned/spent by the Submissive (and Dominant)
 *  - PUNISHMENTS assigned by the Dominant when rules are broken or tasks missed
 *  - THRONE ROOM dashboard for real-time oversight and metrics
 *
 * A shared architecture ensures:
 *  - Instant display via IndexedDB caching (src/data/indexedDB/useIndexedDB.ts)
 *  - Periodic sync (every 30 minutes) with Supabase via React Query
 *  - Unified mutation layer for create/update/delete actions (src/data/mutations)
 *  - Consistent UI layout with <AppLayout> and global counters
 *  - Robust error handling via <ErrorBoundary>
 *
 * GLOBAL LAYOUT & PROVIDERS
 * --------------------------
 * - src/components/app/AppProviders.tsx
 *    • Wraps BrowserRouter, React Query (QueryClientProvider), IndexedDB hydration, and preloads core data (usePreloadTasks, usePreloadRules, etc.)
 * - src/components/AppLayout.tsx
 *    • Renders universal header: Submissive Points, Submissive Supply, DOM Points, DOM Supply
 *    • Includes <MobileNavbar>, <OfflineBanner>, and global <ErrorBoundary>
 * - src/data/indexedDB/useIndexedDB.ts
 *    • Generic IndexedDB API: getItem, setItem, clearItem, getLastSyncTime, setLastSyncTime
 * - src/data/preload/usePreload*.ts
 *    • Fired on app startup to seed IndexedDB with cached Tasks, Rules, Rewards, Punishments
 *
 * RULES PAGE (src/pages/Rules.tsx)
 * -------------------------------
 * • Data Hook: useRulesData (src/data/hooks/useRulesData.ts)
 *    – loadRulesFromDB(), getLastSyncTime('rules')
 *    – fetchRules() via RulesDataHandler (src/data/RulesDataHandler.tsx)
 *    – saveRulesToDB(), setLastSyncTime
 *    – React Query key: ['rules'], config: staleTime=Infinity, refetchOnMount/Focus/Reconn=false, gcTime=30m, retry=3, exponential backoff
 * • Card Component: src/components/RuleCard.tsx
 *    – Displays title, subtext, icon badge, priority badge, background image
 *    – “Rule Broken” button → triggers useCreateRuleViolation mutation, dispatches ‘add-new-punishment’ event
 *    – Calendar tracker (Mon–Sun) shows infraction days
 * • Editor Modal: src/components/RuleEditor.tsx
 *    – Form fields for title, subtext, priority, icon, bg image (focal point, opacity), color pickers, highlighter toggle
 *    – Buttons: Save (floppy icon), Cancel, Delete (trash icon)
 *
 * TASKS PAGE (src/pages/Tasks.tsx)
 * -------------------------------
 * • Data Hook: useTasksData (src/data/hooks/useTasksData.ts)
 *    – IndexedDB + lastSyncTime('tasks') logic, fetchTasks via TasksDataHandler
 *    – React Query key: ['tasks'], staleTime=Infinity, gcTime=1h, retry=3
 * • Card Component: src/components/TaskCard.tsx
 *    – Title, subtext, icon badge, priority badge, bg image
 *    – Calendar tracker, Complete button (green) – triggers useToggleTaskCompletionMutation; updates points via usePointsManager
 *    – Badges: points earned badge, times-per-period (e.g., 2/5)
 * • Editor Modal: src/components/TaskEditor.tsx + TaskEditorForm.tsx
 *    – Fields: title, subtext, priority, points (+/–), frequency, max per period, icon, bg image, colors, highlighter
 *    – Save/Cancel/Delete controls
 *
 * REWARDS PAGE (src/pages/Rewards.tsx)
 * ----------------------------------
 * • Data Hook: useRewards (src/data/queries/useRewards.ts)
 *    – IndexedDB + lastSyncTime('rewards'), fetchRewards via RewardsDataHandler
 *    – React Query key: ['rewards'], staleTime=Infinity, gcTime=30m, retry=1
 * • Card Component: src/components/RewardCard.tsx
 *    – Title, subtext, icon, bg image, cost badge, supply badge, calendar tracker
 *    – “Buy” button (blue/red) → useBuySubReward mutation; deduct Submissive points via usePointsManager; inc supply
 *    – “Use” icon when supply>0 → useRedeemReward mutation; fill calendar
 *    – Border color: Submissive (#00F0FF) or Dominant (#FF0000)
 * • Editor Modal: src/components/RewardEditor.tsx
 *    – Fields: title, subtext, cost (+/–), type toggle, icon, bg image, colors, highlighter
 *    – Save/Cancel/Delete controls
 *
 * PUNISHMENTS PAGE (src/pages/Punishments.tsx)
 * -----------------------------------------
 * • Data Hook: usePunishmentsQuery (src/data/punishments/queries/usePunishmentsQuery.ts)
 *    – IndexedDB + lastSyncTime('punishments'), fetchPunishments
 *    – React Query key: ['punishments'], staleTime=Infinity, gcTime=1h, retry=1
 * • Card Component: src/components/PunishmentCard.tsx
 *    – Title, subtext, icon, bg image, calendar tracker
 *    – “Punish” button (red) → applyPunishmentMutation; updates DOM/Sub points via usePointsManager
 *    – Badges: DOM points earned, Sub points lost
 * • Editor Modal: src/components/PunishmentEditor.tsx
 *    – Fields: title, subtext, DOM points (+/–), Sub points (+/–), icon, bg image, colors, highlighter
 *    – Save/Cancel/Delete controls
 * • Random Punishment Feature:
 *    – src/components/Punishments.tsx hooks into <RandomPunishmentModal>
 *    – Reroll, Confirm actions generate/apply punishment
 *
 * THRONE ROOM PAGE (src/pages/ThroneRoom.tsx)
 * -----------------------------------------
 * • Hook: useCardData (src/components/throne/hooks/useCardData.ts)
 *    – Aggregates metrics (tasks completed, rules broken, rewards used, punishments applied)
 * • Summary Tiles: 
 *    – WeeklyMetricsSummaryTiles.tsx, MonthlyMetricsSummaryTiles.tsx
 * • Charts:
 *    – WeeklyMetricsChart.tsx / MonthlyMetricsChart.tsx
 * • Admin Settings: AdminSettingsCard.tsx
 * • Editors: ThroneRoomEditModal.tsx
 *
 * COMMON COMPONENTS
 * -----------------
 * - src/components/common/EmptyState.tsx
 * - src/components/common/ErrorDisplay.tsx
 * - src/components/common/CachedDataBanner.tsx
 * - src/components/Hydrate.tsx & HydrationErrorBoundary.tsx
 *
 * CUSTOM EVENTS & INTEGRATIONS
 * ----------------------------
 * - 'add-new-rule', 'add-new-task', 'add-new-reward', 'add-new-punishment'
 * - usePointsManager (src/data/points/usePointsManager.ts)
 * - React Query invalidation on each mutation
 *
 * This documentation is the single source of truth for refactoring.
 */
export default {};

// ==================================================
// GOLDEN RULE: USER DATA PRIVACY & SECURITY ENFORCEMENT
// ==================================================
//
// 🔒 CORE PRINCIPLE:
// All data within the application MUST be strictly scoped to either:
//   - The current authenticated user (auth.uid())
//   - Their explicitly linked partner (linked_partner_id)
//
// Under no circumstances should data be visible, accessible, or queryable by
// any other user outside of that direct Dom/Sub pairing.
//
// There is NO SUCH THING as global/public/shared data across unrelated users.
//
// ✅ ENFORCEMENT REQUIREMENTS:
//
// 1. DATABASE-LEVEL SECURITY
// --------------------------
// • Row Level Security (RLS) MUST be enabled on ALL user-related tables.
// • Every user-facing table MUST contain a valid `user_id` UUID column.
// • RLS policies MUST permit access ONLY when:
//     auth.uid() = user_id
//     OR auth.uid() = (SELECT linked_partner_id FROM profiles WHERE id = user_id)
//
// 2. FRONTEND QUERY STRUCTURE
// ---------------------------
// • All Supabase queries MUST include filtering logic scoped to:
//     .eq('user_id', currentUserId)
//     OR .eq('user_id', linkedPartnerId)
//
// • All create/update/delete mutations MUST set the correct `user_id` value.
// • Fetching full tables (i.e. no filter) is STRICTLY PROHIBITED.
// • If a partner is linked, treat their user ID as fully interchangeable.
//
// 3. USER CONTEXT RELIABILITY
// ---------------------------
// • All components must access user ID and linked partner ID via `useUserIds()`.
// • The context must ALWAYS resolve both IDs prior to executing any data query.
// • Partner-linking logic MUST be respected across all features.
//
// 4. ISOLATION IS UNIVERSAL
// -------------------------
// • There is NO exception for any feature, table, or page.
// • All user-generated content (tasks, rewards, punishments, rules, completions, history, etc.)
//   MUST be private and ONLY visible to:
//     - The user who created it
//     - Their linked partner (if applicable)
//
// • Even if a table has no sensitive data, DO NOT make it global unless approved.
//
// 5. FAIL-SAFE BEHAVIOR
// ----------------------
// • If context fails to load user or partner ID, block queries.
// • Never fallback to an unsafe default like "show everything" or "assume public".
// • Log all auth errors, context failures, or ID mismatches immediately.
//
// 6. TESTING + FUTURE MIGRATIONS
// -------------------------------
// • Every new table must include a `user_id` column by default.
// • No new feature may launch without tested RLS and filter logic.
// • Before merging changes, validate behavior as:
//     - Solo user
//     - Linked pair
//     - Unlinked unrelated users
//
// ================================
// PERMANENT NON-NEGOTIABLE RULE:
// ================================
//
// 🔐 IF A QUERY DOES NOT FILTER BY `user_id` OR `linked_partner_id`, IT IS A SECURITY BUG.
// 🔐 IF A TABLE HAS NO RLS, IT IS A SECURITY BUG.
// 🔐 IF A PAGE SHOWS DATA TO A NON-LINKED ACCOUNT, IT IS A SECURITY BUG.
//
// These rules are not flexible. If functionality ever appears to work without respecting
// this security model, the behavior is broken — even if it seems functional.
//
// ====================================
// ALWAYS:
// ====================================
// • Verify context returns both user and partner IDs
// • Confirm Supabase policies are active and correct
// • Check that every query includes proper `.eq('user_id', ...)` logic
// • Enforce this as part of every code review, every refactor, every feature

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

### 7. Tasks Page: Frequency Tracker & Reset System

**Location**: Multiple files coordinated for task reset functionality

**TASKS PAGE: FREQUENCY-TRACKER RESET**
**——————————————————————————————————————**

#### 1. DAILY & WEEKLY TRIGGER (on Tasks page load)
   • Compute keys:
       const today = todayKey();          // "YYYY-MM-DD"
       const week  = currentWeekKey();    // "YYYY-Www"
   • If localStorage.getItem("lastDaily") !== today:
       ▶ resetTaskCompletions("daily");
       ▶ localStorage.setItem("lastDaily", today);
   • If localStorage.getItem("lastWeek") !== week:
       ▶ resetTaskCompletions("weekly");
       ▶ localStorage.setItem("lastWeek", week);

#### 2. RESET TASK COMPLETIONS (in src/lib/taskUtils.ts)
   async function resetTaskCompletions(frequency) {
     // Supabase & IndexedDB UPDATE for current user:
     //   UPDATE tasks
     //     SET completed = false,
     //         last_completed_date = null,
     //         usage_data = []
     //   WHERE frequency = $1 AND user_id = $2;
     // Returns array of reset task IDs for logging.
   }

#### 3. HOOK: checkAndReloadTasks (in src/hooks/useTasksData.ts)
   export async function checkAndReloadTasks() {
     const didReset = await checkAndPerformTaskResets();  // handles localStorage logic + calls resetTaskCompletions()
     if (didReset) {
       const freshData = await loadTasksFromDB();         // read post-reset tasks from IndexedDB
       queryClient.setQueryData(['tasks'], freshData);    // overwrite React Query cache
     }
   }

#### 4. PAGE-LEVEL EFFECT (in src/pages/Tasks.tsx)
   const { user } = useAuthContext();
   const { checkAndReloadTasks } = useTasksData();

   useEffect(() => {
     if (user) {
       checkAndReloadTasks();
     }
   }, [user, checkAndReloadTasks]);

#### 5. VISUAL: FrequencyTracker Component (in src/components/task/FrequencyTracker.tsx)
   • Always render 7 circles (Mon–Sun).
   • If usage_data.length === 0 → all circles empty.
   • If usage_data[i] > 0 → that day's circle is "filled"; otherwise empty.
   • Highlight "today" circle using getCurrentDayOfWeek() index.

#### GOLDEN RULE SUMMARY:
  - ALWAYS run resetTaskCompletions for "daily" and "weekly" on Tasks page load if localStorage keys are missing or outdated.
  - ALWAYS reset ALL tasks matching that frequency: set completed=false, last_completed_date=null, usage_data=[].
  - ALWAYS sync Supabase → IndexedDB → React Query cache immediately after reset.
  - ALWAYS update localStorage keys (lastDaily, lastWeek) immediately after a successful reset.
  - NEVER allow stale usage_data to persist: if usage_data === [], FrequencyTracker must render all circles empty.

**⚠️ DO NOT MODIFY** this reset system without understanding the full data flow and sync strategy.

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
