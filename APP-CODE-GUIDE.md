***File Locked: LOVABLE IS NEVER TO DELETE TEXT FROM THIS FILE. LOVABLE MAY ONLY ADD NEW SECTIONS IF NECESSARY. IF ADDING NEW SECTIONS FOLLOW THE EXACT STYLE OF FORMATTING ALREADY IN PLACE ***

***This application follows strict architectural patterns that have been carefully designed and tested. **DO NOT** modify the core data flow patterns without understanding the full system architecture.***

================================
# APP OVERVIEW:
================================
- This app is designed to connect a Dominant and Submissive user within a structured behavioral dynamic. The platform allows the creation and enforcement of rules, assignment of tasks, and management of a customizable reward and punishment system.

- It serves as both a tracker and engagement tool for BDSM-like relationship structures. The Submissive is responsible for completing assigned behaviors and tasks, while the Dominant retains full oversight, decision-making authority, and control over earned or corrective actions.

- The goal of the app is to facilitate consistent structure, accountability, and mutual interaction in a consensual power exchange relationship.

================================
# PAGE BREAKDOWN FOR APP
================================

- The app consists of five main pages, each serving a specific role in behavior tracking and relationship dynamics:

- RULES PAGE: This is where the Dominant sets expectations. Rules are persistent guidelines that define the structure of the relationship. Users can create, edit, and track the status of each rule, including infractions.

- TASKS PAGE: Tasks are individual, one-time or recurring assignments given to the Submissive. This page allows tracking progress, completion, and status of assigned tasks. Some tasks may be mandatory, others optional, and some may have deadlines.

- REWARDS PAGE: Rewards are configured by the Dominant and earned by the Submissive based on completed tasks, good behavior, or earned points. This page manages the available reward pool and redemption options.

- PUNISHMENTS PAGE: This page allows the Dominant to assign, track, and manage punishments when rules are broken or tasks are missed. Punishments can vary in severity and type and are logged for accountability.

- THRONE ROOM: The Throne Room acts as the central dashboard and authority center for the Dominant. It displays key summaries, active punishments, rewards, tasks, and allows real-time decisions and oversight over the Submissive's behavior and performance.

================================
# USER ROLES  
================================

- Submissive users:
	- Follow rules on the Rules page
	- Receive punishments when rules are broken
	- Complete tasks to earn points
	- Spend points on Rewards

- Dominant users:
	- Maintain structure and discipline
	- Select punishments and issue consequences
	- Earn DOM points through punishments
	- Spend DOM points on Dominant Rewards

================================
# USER ROLE DATA FLOW ARCHITECTURE:
================================

- Core Principle: Dual Role Access Pattern
	- The application implements a dual role access pattern to handle user roles safely in both synchronous UI contexts and asynchronous business logic contexts.

- Data Sources and Authority: 
	- Single Source of Truth: The profiles.role column in the Supabase database is the authoritative source for all user roles
	- UI Fallback Cache: User metadata (auth.user.user_metadata.role) serves as a local cache for immediate UI display only
	- Business Logic: All functional operations (partner linking, points calculations, etc.) must use the database value

- Role Function Architecture: 
	- getUserRole() - Async Database Authority
	- Purpose: Authoritative role retrieval for business logic
	- Source: Queries profiles.role column directly
	- Usage: Partner linking, role updates, admin checks, any decision-making logic
	- Return Type: Promise<ProfileRole | null>
	- Never Used In: Direct JSX rendering (would cause Promise rendering crashes)
	- getUserRoleSync() - Synchronous UI Display

- Purpose: Immediate role display in UI components: 
	- Source: Reads from auth.user.user_metadata.role
	- Usage: AppLayout header, AccountSheet display, any JSX that needs immediate rendering
	- Return Type: string (safe for JSX)
	- Never Used For: Business logic decisions or data operations
	- Data Flow During Role Changes

- User updates role via updateUserRole(newRole):
	- Database profiles.role is updated (source of truth)
	- User metadata is simultaneously updated for UI consistency
	- Local user state is updated for immediate UI feedback
	- All subsequent business logic uses the database value
	- All UI continues to display from the updated metadata

- Context Integration:
	- AuthContext Interface: Exposes both getUserRole and getUserRoleSync
	- Component Access: Components use useAuth() hook to access both functions
	- Type Safety: TypeScript enforces correct usage patterns

- Critical Rules:
	- NEVER use getUserRoleSync() for business logic or partner linking
	- NEVER render getUserRole() directly in JSX (it returns a Promise)
	- ALWAYS use getUserRole() for database operations and decision-making
	- ALWAYS use getUserRoleSync() for immediate UI display needs
	- MAINTAIN metadata as a display cache only, not a business logic source

- Error Prevention:
	- Promise rendering crashes in React components
	- Role inconsistencies between UI and business logic
	- Race conditions during role updates
	- Authentication state conflicts

================================
# UNIVERSAL PAGE HEADER  
================================

- At the top of each page is a universal header displaying four global counters:
	- Submissive Points (black background, turquoise border, coin icon)
	- Submissive Supply (black background, turquoise border, box icon)
	- DOM Points (black background, red border, crown icon)
	- DOM Supply (black background, red border, box icon)

-  These are updated automatically when actions occur such as buying rewards or issuing punishments.

================================
# RULES PAGE
================================

- Each rule card contains:
	- Title and subtext
	- Icon badge
	- Priority badge (Low/Medium/High)
	- Background image (customizable with opacity and focal point)
	- Rule Broken button (red with white text)
	- Calendar tracker (Monday–Sunday view)

- The Edit Modal allows:
	- Title/subtext
	- Priority
	- Background image with focal point + opacity
	- Icon selection
	- Title/subtext/icon/calendar color
	- Highlighter toggle
	- Delete (red with trash icon), Cancel (red), Save Changes (light blue with floppy icon)

- Data Hook:
	- `useRulesData (src/data/hooks/useRulesData.ts)`  
	→ `useRules (src/data/rules/queries.ts)`

- Cache Strategy:
	- `loadRulesFromDB()`  
	- If `getLastSyncTimeForRules()` < 30min → skip network  
	- Else → `fetchRulesFromServer()` → `saveRulesToDB()` + `setLastSyncTimeForRules()`  
	- On error → use localData fallback

- React Query Config:
	- `staleTime: Infinity`  
	- `refetchOnWindowFocus: false`  
	- `refetchOnReconnect: false`  
	- `refetchOnMount: false`  
	- `gcTime: 1 hour`  
	- `retry: 3`  
	- `retryDelay: exponential`

- Mutations:
	- `useCreateRule`  
	- `useUpdateRule`  
	- `useDeleteRule`  
	- `useCreateRuleViolation`

- UI Wrapping:
	- `<AppLayout>`, `<ErrorBoundary>`  
	- Conditional: `isLoading`, `error`, `<RulesList>`  
	- Listens for `'add-new-rule'` event → opens `<RuleEditor>`

================================
# TASKS PAGE
================================

- Each task card contains:
	- Title and subtext
	- Icon badge
	- Priority badge
	- Background image (customizable)
	- Calendar tracker
	- Complete button (green)
	- Points badge (submissive points)
	- Times per period badge (e.g. 2/5 completions)

- The Edit Modal allows:
	- Title/subtext
	- Priority
	- Points (plus/minus buttons)
	- Frequency (daily/weekly)
	- Times per period (plus/minus)
	- Background image with focal point + opacity
	- Icon selection
	- Title/subtext/icon/calendar color
	- Highlighter toggle
	- Delete (red with trash icon), Cancel (red), Save Changes (light blue with floppy icon)

- Data Hook:
	- `useTasksData (src/hooks/useTasksData.ts)`  
	→ `useTasksQuery (src/data/tasks/queries.ts)`

- Cache Strategy:
	- `loadTasksFromDB()`  
	- If `getLastSyncTimeForTasks()` < 30min **and** localData exists → skip network  
	- Else → `fetchTasks()` → `saveTasksToDB()` + `setLastSyncTimeForTasks()`

- React Query Config:
	- `staleTime: Infinity`  
	- `refetchOnWindowFocus: false`  
	- `refetchOnReconnect: false`  
	- `refetchOnMount: false`  
	- `gcTime: 1 hour`  
	- `retry: 3`  
  - `retryDelay: exponential`

- Mutations:
	- `useCreateTask`  
	- `useUpdateTask`  
	- `useDeleteTask`  
	- `useToggleTaskCompletionMutation`

- UI Wrapping:
	- `<AppLayout>`, `<RewardsProvider>`, `<ErrorBoundary>`  
	- Conditional: `isLoading`, `error`, `<EmptyState>`, `<TasksList>`  
	- Listens for `'add-new-task'` event → opens `<TaskEditor>`

================================
# TASKS PAGE (Calendar tracker & Task tracking/handling)
================================

- DAILY & WEEKLY CALENDAR TRACKER TRIGGER (on Tasks page load)
	- Compute keys:
		- const today = todayKey();          // "YYYY-MM-DD"
		- const week  = currentWeekKey();    // "YYYY-Www"
	- If localStorage.getItem("lastDaily") !== today:
		- resetTaskCompletions("daily");
		- localStorage.setItem("lastDaily", today);
- If localStorage.getItem("lastWeek") !== week:
		- resetTaskCompletions("weekly");
 		- localStorage.setItem("lastWeek", week);

- TASK COMPLETION RESET (in src/lib/taskUtils.ts)
  async function resetTaskCompletions(frequency) {
     // Supabase & IndexedDB UPDATE for current user:
     //   UPDATE tasks
     //     SET completed = false,
     //         last_completed_date = null,
     //         usage_data = []
     //   WHERE frequency = $1 AND user_id = $2;
     // Returns array of reset task IDs for logging.
   }

- HOOK: checkAndReloadTasks (in src/hooks/useTasksData.ts)
   export async function checkAndReloadTasks() {
     const didReset = await checkAndPerformTaskResets();  // handles localStorage logic + calls resetTaskCompletions()
     if (didReset) {
       const freshData = await loadTasksFromDB();         // read post-reset tasks from IndexedDB
       queryClient.setQueryData(['tasks'], freshData);    // overwrite React Query cache
     }
   }

- PAGE-LEVEL EFFECT (in src/pages/Tasks.tsx)
   const { user } = useAuthContext();
   const { checkAndReloadTasks } = useTasksData();
   useEffect(() => {
     if (user) {
       checkAndReloadTasks();
     }
   }, [user, checkAndReloadTasks]);

- VISUAL: FrequencyTracker Component (in src/components/task/FrequencyTracker.tsx)
   • Always render 7 circles (Mon–Sun).
   • If usage_data.length === 0 → all circles empty.
   • If usage_data[i] > 0 → that day's circle is "filled"; otherwise empty.
   • Highlight "today" circle using getCurrentDayOfWeek() index.

- GOLDEN RULE SUMMARY:
  - ALWAYS run resetTaskCompletions for "daily" and "weekly" on Tasks page load if localStorage keys are missing or outdated.
  - ALWAYS reset ALL tasks matching that frequency: set completed=false, last_completed_date=null, usage_data=[].
  - ALWAYS sync Supabase → IndexedDB → React Query cache immediately after reset.
  - ALWAYS update localStorage keys (lastDaily, lastWeek) immediately after a successful reset.
  - NEVER allow stale usage_data to persist: if usage_data === [], FrequencyTracker must render all circles empty.


================================
# REWARDS PAGE
================================

- Each reward card contains:
	- Title and subtext
	- Icon badge
	- Background image (custom)
	- Cost badge
	- Supply badge (increments on purchase)
	- Calendar tracker
	- Buy button (top-right, blue or red depending on reward type)

- Border color indicates type:
	- Submissive = light blue `#00F0FF`
	- Dominant = red (e.g. `#FF0000` from code)

- Dominant rewards show a crown icon in the cost badge. Submissive rewards use the coin icon.

- The Edit Modal allows:
	- Title/subtext
	- Cost (plus/minus)
	- Reward type toggle (Dominant/Submissive)
	- Icon selection
	- Background image with focal point + opacity
	- Title/subtext/icon/calendar color
	- Highlighter toggle
	- Delete (red with trash icon), Cancel (red), Save Changes (light blue with floppy icon)

- Data Hook:
	- `useRewards (src/data/queries/useRewards.ts)`

- Cache Strategy:
	- `loadRewardsFromDB()`  
	- If `getLastSyncTimeForRewards()` < 30min **and** localData exists → skip network  
	- Else → `fetchRewards()` → `saveRewardsToDB()` + `setLastSyncTimeForRewards()`  
	- On error → use localData fallback

- React Query Config:
	- `staleTime: Infinity`  
	- `refetchOnWindowFocus: false`  
	- `refetchOnReconnect: false`  
	- `refetchOnMount: false`  
	- `gcTime: 1 hour`  
	- `retry: 3`  
	- `retryDelay: exponential`

- Mutations:
	- `useCreateRewardMutation`  
	- `useUpdateRewardMutation`  
	- `useDeleteRewardMutation`  
	- `useBuySubReward`  
	- `useRedeemSubReward`

- UI Wrapping:
	- `<AppLayout>`, `<ErrorBoundary>`, `<AuthContext>`, `<PointsManager>`  
	- Displays: `<RewardsList>`, `<RewardEditor>`  
	- Header add button → opens editor

================================
# PUNISHMENTS PAGE
================================

- Each punishment card contains:
	- Title and subtext
	- Icon badge
	- Background image (custom)
	- Calendar tracker
	- Punish button (red, top-right)
	- DOM Points badge (crown icon, red border, black background)
	- Submissive Points badge (negative value, turquoise border, black background)

- The Edit Modal allows:
	- Title/subtext
	- DOM Points Earned (plus/minus)
	- Submissive Points Lost (plus/minus)
	- Background image with focal point + opacity
	- Icon selection
 	- Title/subtext/icon/calendar color
	- Highlighter toggle
	- Delete (red with trash icon), Cancel (red), Save Changes (light blue with floppy icon)


- The page also includes a Random button:
	-src/components/Punishments.tsx hooks into <RandomPunishmentModal>
	- Reroll, Confirm actions generate/apply punishment
	- Opens a modal to randomly select a punishment
	- Previews the selected card
	- Allows user to confirm or reroll

- Data Hook:
	- `usePunishmentsQuery (src/data/punishments/queries/usePunishmentsQuery.ts)`  
	→ `fetchPunishments (src/data/punishments/queries/fetchPunishments.ts)`

- Cache Strategy:
	- `loadPunishmentsFromDB()`  
	- If `getLastSyncTimeForPunishments()` < 30min **and** localData exists → skip network  
	- Else → `fetchPunishments()` → `savePunishmentsToDB()` + `setLastSyncTimeForPunishments()`  
	- On error → use localData fallback

- React Query Config:
	- `staleTime: Infinity`  
	- `refetchOnWindowFocus: false`  
	- `refetchOnReconnect: false`  
	- `refetchOnMount: false`  
	- `gcTime: 1 hour`  
	- `retry: 3`  
	- `retryDelay: exponential`

- **Mutations:**
  - `useCreatePunishment`  
  - `useUpdatePunishment`  
  - `useDeletePunishment`

- **UI Wrapping:**
  - `<AppLayout>`, `<ErrorBoundary>`  
  - Displays: `<PunishmentList>`  
  - Listens for `'add-new-punishment'` event → opens `<PunishmentEditor>`

================================
# THRONE ROOM
================================

- Displays weekly chart + tiles displaying weekly data:
	- Tasks completed
	- Rules broken
	- Rewards (redeemed)
	- Punishments 

- Displays monthly chart + tiles displaying monthly data:
	- Tasks completed
	- Rules broken
	- Rewards (redeemed)
	- Punishments 

- Hook: useCardData (src/components/throne/hooks/useCardData.ts)

================================
# DATA SYNC & CACHING GOLD STANDARD
================================

- GOALS **NON-NEGOTIABLE**:
	- Eliminate loading spinners and flickers **caused by delayed rendering**
	- Render all pages instantly from local cache or hydration
	- Any code that shows loading screens instead of immediate UI is considered **BROKEN**
	- Allow offline use and full sync recovery
	- Prevent over-querying Supabase or hitting data cap limits
	- Support long-term scaling to thousands of users
	- Support consistent behavior, instant rendering, and long-term maintainability across all primary feature pages — **Rewards**, **Rules**, **Tasks**, **Punishments**, and **Throne Room**

- LOADING UI GUIDELINES:
	- Do **not** use skeleton cards or placeholder shapes
	- Do **not** delay card render to show a "Loading..." message
	- Do **not** hardcode loading logic in the component structure
	- DO allow a **simple spinning circle icon**, positioned in the **app header**, to indicate background sync activity — *but only if the rest of the page is already visible and interactive*
	- Pages must render cards immediately from cache without delay or visual placeholders
	- No skeleton or fallback card placeholders are allowed — cards must either render or the page should remain static

- REQUIRED STRUCTURE FOR ALL PAGES (RULES, TASKS, REWARDS, PUNISHMENTS, THRONE ROOM):

1. Centralized Query Hooks:
	- All data fetching must be performed using a domain-specific hook (e.g. `useTasks.ts`) located in `/src/data/queries/`
	- Each uses `useQuery({ staleTime: Infinity })` to avoid re-fetching unnecessarily
	- All React Query hooks must disable auto-refetching by setting `staleTime: Infinity`

2. Centralized Mutation Hooks:
	- All create, update, and delete actions must use isolated mutation hooks in `/src/data/mutations/`
	- Use `queryClient.setQueryData()` to optimistically update the UI
	- Mutations must use `queryClient.setQueryData()` to update cache. `.refetch()` is not allowed
	- No logic embedded in UI files

3. Persistent Local Cache:
	- All query data must persist between sessions using `@tanstack/react-query-persist-client` and IndexedDB hydration
	- Store cache in `IndexedDB` with versioning and hydration
	- The root app layout must include `<Hydrate />` and initialize persisted data before rendering pages

4. No Supabase in UI:
	- UI components must not use `supabase.from(...)` directly
	- Pages and components must not directly call `supabase.from(...)`. All database access must go through query/mutation hooks

5. Hooks-Only Interface:
	- UI should only interact with hook returns — no direct data shaping, filtering, or persistence logic in components
	- Components only access and display data returned by hooks

6. Immediate Card Render:
	- All cards and pages must render immediately from the hydrated cache
	- Never wait for queries to return from Supabase before displaying UI

7. Controlled Background Refetching:
	- Background syncing (Supabase) must be triggered only on tab focus or app startup — never on page mount
	- Only allow background refetch on app startup or tab focus
	- Disable auto-refetching on mount, reconnect, or window focus

8. Global Query Config:
	- All query clients must be configured centrally in `react-query-config.ts` with uniform behavior for retries, refetch, etc

9. useSyncManager Hook:
	- Each page must use `useSyncManager` to control when syncing occurs without tying it to render logic

10. Global Points Cache:
	- Submissive and DOM points must be cached and updated through React Query
	- Do not calculate totals manually or via multiple DB calls

================================
# IMAGE HANDLING & COMPRESSION 
================================

- Controlled Image Upload Flow:
	- All user-uploaded images are automatically optimized before storage
	- Images are compressed using `browser-image-compression`
	- Maximum dimensions: 1920×1080 (for card backgrounds)
	- All files are converted to `.jpeg` format regardless of original
	- No cropping or resizing is required from the user
	- Upload is silent and handled on the backend
	- URLs are stored via Supabase Storage with public access
	- Ensure upload loading states are scoped and don’t trigger full rerenders
- **NEVER** bypass image compression for any uploaded images
- **NEVER** modify core compression settings without system-wide testing
- **NEVER** skip `processImageForSave` in create/update mutations
- **NEVER** omit `background_image_url` and `image_meta` from entity schemas
- **NEVER** store uncompressed images in the database

- Integration Utilities (Per Feature)
	- `src/utils/image/taskIntegration.ts` - Tasks-specific image handling
	- `src/utils/image/ruleIntegration.ts` - Rules-specific image handling  
	- `src/utils/image/rewardIntegration.ts` - Rewards-specific image handling
	- `src/utils/image/punishmentIntegration.ts` - Punishments-specific image handling

- Each provides:
```typescript
export const handleImageUpload = async (
  file: File,
  setValue: any,
  setImagePreview: (url: string | null) => void
): Promise<void> => {
  // 1. Compress image using core compression engine
  // 2. Convert to base64 for immediate UI display
  // 3. Update form values with compressed image + metadata
  // 4. Log compression statistics
};

export const processImageForSave = async (
  imageUrl: string | null
): Promise<{ processedUrl: string | null; metadata: any }> => {
  // Handles existing vs new images during save operations
};
```

================================
# TOAST POSITIONING — UI POLICY  
================================
- All toast notifications must appear at the **very top of the screen**, directly inside the app's header container — **above the page content but below the top system bar**.
- Toast width should stretch across the full horizontal space of the app without fixed max width.
- Text should use a **very small font size** to avoid visual disruption.
- Toasts must not float in random corners or center overlays.
- Position must be consistent across all pages.
- Applies to all types: success, error, warning, and info.
- Styling must be minimal: no shadows, no border radius, flat background color.

================================
# GLOBAL LAYOUT & PROVIDERS
================================

- src/components/app/AppProviders.tsx
	- Wraps BrowserRouter, React Query (QueryClientProvider), IndexedDB hydration, and preloads core data (usePreloadTasks, usePreloadRules, etc.)
- src/components/AppLayout.tsx
	- Renders universal header: Submissive Points, Submissive Supply, DOM Points, DOM Supply
	- Includes <MobileNavbar>, <OfflineBanner>, and global <ErrorBoundary>
- src/data/indexedDB/useIndexedDB.ts
	- Generic IndexedDB API: getItem, setItem, clearItem, getLastSyncTime, setLastSyncTime
- src/data/preload/usePreload*.ts
	- Fired on app startup to seed IndexedDB with cached Tasks, Rules, Rewards, Punishments

================================
# COMMON COMPONENTS
================================

- src/components/common/EmptyState.tsx
- src/components/common/ErrorDisplay.tsx
- src/components/common/CachedDataBanner.tsx
- src/components/Hydrate.tsx & HydrationErrorBoundary.tsx

================================
# CUSTOM EVENTS & INTEGRATIONS
================================

- 'add-new-rule', 'add-new-task', 'add-new-reward', 'add-new-punishment'
- usePointsManager (src/data/points/usePointsManager.ts)
- React Query invalidation on each mutation

================================
# USER DATA PRIVACY & SECURITY ENFORCEMENT
================================

- CORE PRINCIPLE:
	- All data within the application MUST be strictly scoped to either:
	- The current authenticated user (auth.uid())
	- Their explicitly linked partner (linked_partner_id)

- Under no circumstances should data be visible, accessible, or queryable by any other user outside of that direct Dom/Sub pairing.

- There is NO SUCH THING as global/public/shared data across unrelated users.

1. DATABASE-LEVEL SECURITY:
	- Row Level Security (RLS) MUST be enabled on ALL user-related tables.
	- Every user-facing table MUST contain a valid `user_id` UUID column.
	- RLS policies MUST permit access ONLY when:
	- auth.uid() = user_id
	- OR auth.uid() = (SELECT linked_partner_id FROM profiles WHERE id = user_id)

2. FRONTEND QUERY STRUCTURE:
- All Supabase queries MUST include filtering logic scoped to:
	- .eq('user_id', currentUserId)
	- OR .eq('user_id', linkedPartnerId)
	- All create/update/delete mutations MUST set the correct `user_id` value.
	- Fetching full tables (i.e. no filter) is STRICTLY PROHIBITED.
	- If a partner is linked, treat their user ID as fully interchangeable.

3. USER CONTEXT RELIABILITY:
	- All components must access user ID and linked partner ID via `useUserIds()`.
	- The context must ALWAYS resolve both IDs prior to executing any data query.
	- Partner-linking logic MUST be respected across all features.

 4. ISOLATION IS UNIVERSAL
	- There is NO exception for any feature, table, or page.
	- All user-generated content (tasks, rewards, punishments, rules, completions, history, etc.)
	- MUST be private and ONLY visible to:
		- The user who created it
		- Their linked partner (if applicable)
	- Even if a table has no sensitive data, DO NOT make it global unless approved.

5. FAIL-SAFE BEHAVIOR
	- If context fails to load user or partner ID, block queries.
	- Never fallback to an unsafe default like "show everything" or "assume public".
	- Log all auth errors, context failures, or ID mismatches immediately.

6. TESTING + FUTURE MIGRATIONS
	- Every new table must include a `user_id` column by default.
	- No new feature may launch without tested RLS and filter logic.
	- Before merging changes, validate behavior as:
		- Solo user
		- Linked pair
		- Unlinked unrelated users

7. PERMANENT NON-NEGOTIABLE RULE:
	- IF A QUERY DOES NOT FILTER BY `user_id` OR `linked_partner_id`, IT IS A SECURITY BUG.
	- IF A TABLE HAS NO RLS, IT IS A SECURITY BUG.
	- IF A PAGE SHOWS DATA TO A NON-LINKED ACCOUNT, IT IS A SECURITY BUG.
	- Verify context returns both user and partner IDs
	- Confirm Supabase policies are active and correct
	- Check that every query includes proper `.eq('user_id', ...)` logic
	- Enforce this as part of every code review, every refactor, every feature

- These rules are not flexible. If functionality ever appears to work without respecting this security model, the behavior is broken — even if it seems functional.

================================
# CRITICAL RULES - NEVER BREAK THESE
================================

1. IndexedDB Functions:
- **NEVER** modify functions in `src/data/indexedDB/useIndexedDB.ts`
- **NEVER** change the 30-minute sync threshold
- **NEVER** remove the fallback-to-cache-on-error logic

2. React Query Configuration:
- **NEVER** change `staleTime: Infinity`
- **NEVER** enable `refetchOnWindowFocus`, `refetchOnReconnect`, or `refetchOnMount`
- **NEVER** modify retry/gcTime without updating all pages

3. Data Flow:
- **NEVER** bypass the IndexedDB caching layer
- **NEVER** call Supabase directly from UI components
- **NEVER** modify the dual-layer caching strategy

4. Task Completion System:
- **NEVER** simplify the task completion logic without understanding points/usage tracking
- **NEVER** remove optimistic updates from task operations
- **NEVER** modify `useToggleTaskCompletionMutation` without full system understanding

5. Error Handling:
- **NEVER** remove try/catch blocks in data fetching
- **NEVER** remove fallback to cached data on errors
- **NEVER** change the error boundary structure

6. Mutation Callbacks:
- **NEVER** remove `onSuccessCallback` from mutations
- **NEVER** skip IndexedDB updates in mutation success handlers
- **NEVER** remove sync time updates

7. NO LOADING SCREENS POLICY - ABSOLUTELY CRITICAL:
- **NEVER** add loading screens, loading spinners, or "Loading..." text anywhere in the app
- **NEVER** show loading states that block or replace the actual UI content
- **NEVER** use conditional rendering based on loading states that hide content
- **NEVER** add components like `<LoadingSpinner />`, `<LoadingScreen />`, or similar
- **NEVER** show "Please wait...", "Loading session...", "Restoring data..." or any loading messages
- **NEVER** use `if (loading) return <LoadingComponent />` patterns anywhere

8. NEVER CHANGE UI ELEMENTS:
- **NEVER** move UI elements
- **NEVER** add UI elements without specific instructions
- **NEVER** change UI element styling, coloring, text etc. without instruction.

9. NO CODE CREEP:
- **NEVER** code creep, ALWAYS stick to the outlined plan you have presented to the {{user}}

10. ERROR HANDLING:
- **NEVER** SPOT FIX ERRORS. Always review the entire code structure for the APP/PAGE/FILE before making changes.
- **NEVER** Adress errors without fully reading the APP-CODE-GUIDE read me file.

================================
# TROUBLESHOOTING COMMON ISSUES
================================

- "Data not loading"
	- Check if IndexedDB functions are working
	- Verify 30-minute sync logic
	- Check React Query cache status
	- Ensure error fallbacks are intact

- "Mutations not working"
	- Verify `onSuccessCallback` is updating IndexedDB
- Check if `entityName` is provided for optimistic mutations
- Ensure sync timestamps are being updated

- "Offline mode broken"
	- Verify IndexedDB caching is functioning
	- Check if fallback-to-cache logic is intact
	- Ensure error handling preserves cached data

- "Performance issues"
	- Check if React Query settings match the contract
	- Verify IndexedDB operations aren't being called excessively
	- Ensure proper garbage collection times

- "Images not compressing"
	- Verify `handleImageUpload` is called on file selection
	- Check if integration utility exists for the feature
	- Ensure `processImageForSave` is used in mutations
	- Verify database schema includes image fields

================================
# FILE STRUCTURE REFERENCE
================================
// LOVABLE ONLY HAS PERMISSION TO DELETE/REORGANIZE/REFORMAT TEXT IN THIS SECTION ONLY IF IT IS REQUIRED TO REBUILD THE FILE STRUCTURE REFERENCE:

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
├── utils/
│   └── image/                           # 🚨 CRITICAL - Image compression system
│       ├── compression.ts               # Core compression engine
│       ├── taskIntegration.ts           # Tasks image handling
│       ├── ruleIntegration.ts           # Rules image handling
│       ├── rewardIntegration.ts         # Rewards image handling
│       └── punishmentIntegration.ts     # Punishments image handling
└── lib/
    ├── optimistic-mutations.ts          # 🚨 CRITICAL - Mutation system
    └── taskUtils.ts                     # 🚨 CRITICAL - Task processing logic




