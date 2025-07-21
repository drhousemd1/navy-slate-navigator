
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
	- Ensure upload loading states are scoped and don't trigger full rerenders
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
# NOTIFICATION SYSTEM - COMPREHENSIVE BREAKDOWN
================================

- SYSTEM OVERVIEW:
	- The notification system is a sophisticated multi-layered architecture designed to deliver contextually-aware push notifications across web and native platforms. It handles user preferences, batching, rate limiting, smart filtering, and maintains a persistent notification history. The system respects user privacy and operates within the app's Dom/Sub partner relationship model.

- CORE ARCHITECTURE COMPONENTS:

1. NOTIFICATION QUEUE MANAGEMENT
	- File: src/services/notificationQueue.ts
	- Purpose: Handles batching, rate limiting, and intelligent notification delivery

	# Key Features:
	- Batches multiple notifications of the same type within 5-second windows
	- Rate limits notifications to prevent spam (10-second minimum between same-type notifications)
	- Critical notifications bypass all queuing and send immediately
	- Intelligent message creation for batched notifications

	# Critical Notification Types (Never Queued):
	- ruleBroken - Always sent immediately
	- wellnessCheckin - Always sent immediately

	# Batchable Notification Types:
	- taskCompleted - Batched with point totals
	- rewardPurchased - Batched with cost totals
	- rewardRedeemed - Batched by count
	- punishmentPerformed - Batched with point deductions
	- messages - Batched by message count

2. SMART NOTIFICATION FILTERING
	- File: src/services/smartNotificationFilter.ts
	- Purpose: Context-aware filtering to reduce notification noise

	# Filtering Logic:
	- App Activity Detection: Suppresses low/normal priority notifications when user is actively using the app
	- Quiet Hours: User-configurable time periods where notifications are suppressed
	- Priority-Based Override: Critical and high-priority notifications bypass quiet hours
	- User Activity Tracking: Monitors mouse, keyboard, touch, and visibility events

	# Filter Priorities:
	- critical - Always delivered (ruleBroken, wellnessCheckin)
	- high - Bypasses quiet hours if configured (wellnessCheckin)
	- normal - Standard filtering applies (taskCompleted, rewardPurchased, punishmentPerformed)
	- low - Most restrictive filtering (rewardRedeemed, wellnessUpdated, messages)

3. PUSH NOTIFICATION MANAGEMENT
	- File: src/services/pushNotificationManager.ts
	- Purpose: Platform-agnostic push notification delivery

	# Architecture:
	- Factory Pattern: Creates appropriate manager based on platform (web vs native)
	- Web Push Manager: Handles browser-based notifications via service worker
	- Native Push Manager: Handles Capacitor-based mobile notifications

	# Platform Detection:
	- Uses Capacitor.isNativePlatform() to determine platform
	- Singleton pattern ensures consistent manager instance
	- Each platform has specific initialization and permission handling

4. NOTIFICATION HISTORY & PERSISTENCE
	- File: src/services/notificationHistory.ts
	- Purpose: Local storage-based notification history and management

	# Features:
	- Stores up to 100 recent notifications in localStorage
	- Tracks read/unread status for each notification
	- Generates deep links for notification actions
	- Provides notification-specific action buttons
	- Supports bulk operations (mark all read, clear history)

	# Deep Link Mapping:
	- taskCompleted → /tasks
	- rewardPurchased/rewardRedeemed → /rewards
	- punishmentPerformed → /punishments
	- ruleBroken → /rules
	- wellnessUpdated/wellnessCheckin → /wellbeing
	- messages → /messages

5. USER NOTIFICATION PREFERENCES
	- File: src/hooks/useNotificationSettings.ts
	- Database Table: user_notification_preferences
	- Purpose: Manages user-specific notification preferences

	# Preference Structure:
	- {
		enabled: boolean,
		types: {
			ruleBroken: boolean,
			taskCompleted: boolean,
			rewardPurchased: boolean,
			rewardRedeemed: boolean,
			punishmentPerformed: boolean,
			wellnessUpdated: boolean,
			wellnessCheckin: boolean,
			messages: boolean
		}
	}

6. PUSH SUBSCRIPTION MANAGEMENT
	- File: src/hooks/usePushSubscription.ts
	- Database Table: user_push_subscriptions
	- Purpose: Manages browser push notification subscriptions

	# Key Functions:
	- Checks browser support for push notifications
	- Handles permission requests with proper user gesture timing
	- Manages subscription lifecycle (subscribe/unsubscribe)
	- Stores subscription data in database for server-side sending

7. MESSAGE-SPECIFIC SMART NOTIFICATIONS
	- File: src/hooks/useSmartMessageNotifications.ts
	- Purpose: Specialized handling for message notifications

	# Logic:
	- Suppresses notifications when user is actively on messages page
	- Prevents self-notifications (sending messages to yourself)
	- Respects user notification preferences
	- Creates message previews (first 50 characters)

- APP FEATURE INTEGRATIONS:

	# TASKS INTEGRATION:
	- Files: Task mutation files call queueTaskCompletedNotification
	- Trigger: When tasks are completed via useToggleTaskCompletionMutation
	- Data Passed: Task name, points earned
	- Batching: Multiple task completions batch together with total points

	# REWARDS INTEGRATION:
	- Files: Reward mutation files call purchase/redemption notification methods
	- Triggers:
		- useBuySubReward → queueRewardPurchasedNotification
		- useRedeemSubReward → queueRewardRedeemedNotification
	- Data Passed: Reward name, cost (for purchases)
	- Batching: Multiple reward actions batch by type

	# PUNISHMENTS INTEGRATION:
	- Files: Punishment mutation files call queuePunishmentPerformedNotification
	- Trigger: When punishments are applied via useApplyPunishment
	- Data Passed: Punishment name, points deducted
	- Batching: Multiple punishments batch with total point deductions

	# MESSAGES INTEGRATION:
	- Files: Message hooks use useSmartMessageNotifications
	- Trigger: When new messages are sent
	- Smart Logic: Context-aware delivery based on app state and current page
	- Privacy: Never sends notifications to self

- UI COMPONENTS & PAGES:

	# NOTIFICATION BADGE:
	- File: src/components/common/NotificationBadge.tsx
	- Location: App header (top-right)
	- Function: Shows unread count, navigates to notification center
	- Updates: Real-time via notification history polling

	# NOTIFICATION CENTER:
	- File: src/pages/NotificationCenter.tsx
	- Route: /notifications
	- Features:
		- Complete notification history display
		- Smart filter configuration UI
		- Bulk actions (mark all read, clear history)
		- Individual notification actions and deep links
		- Real-time status monitoring

	# NOTIFICATION SETTINGS:
	- File: src/pages/Notifications.tsx
	- Route: /profile/notifications
	- Features:
		- Master notification toggle
		- Individual notification type controls
		- Push subscription management
		- Wellness reminder configuration
		- Browser permission handling

	# ACCOUNT SHEET INTEGRATION:
	- File: src/components/AccountSheet.tsx
	- Integration: "Notifications" button in popup menu
	- Navigation: Links to notification settings page

- DATABASE SCHEMA:

	# user_notification_preferences:
	- id: uuid (PRIMARY KEY)
	- user_id: uuid (FOREIGN KEY to auth.users)
	- preferences: jsonb (notification preferences object)
	- created_at: timestamp
	- updated_at: timestamp

	# user_push_subscriptions:
	- id: uuid (PRIMARY KEY)
	- user_id: uuid (FOREIGN KEY to auth.users)
	- endpoint: text (push subscription endpoint)
	- p256dh: text (encryption key)
	- auth: text (authentication secret)
	- user_agent: text (browser info)
	- created_at: timestamp
	- updated_at: timestamp

- SUPABASE EDGE FUNCTION:

	# send-push-notification:
	- File: supabase/functions/send-push-notification/index.ts
	- Purpose: Server-side push notification delivery
	- Features:
		- VAPID-based web push notifications
		- User authorization verification (partner linking)
		- Preference checking before sending
		- Invalid subscription cleanup
		- Native push implementation (FCM/APNs)

	# Required Environment Variables:
	- VAPID_PUBLIC_KEY - Web push public key
	- VAPID_PRIVATE_KEY - Web push private key
	- SUPABASE_URL - Supabase project URL
	- SUPABASE_SERVICE_ROLE_KEY - Service role key
	- FCM_SERVER_KEY - Firebase Cloud Messaging server key

- SECURITY & PRIVACY:

	# USER SCOPING:
	- All notifications respect the Dom/Sub partner relationship model
	- Users can only send notifications to themselves or their linked partner
	- Edge function verifies authorization before sending

	# PREFERENCE ENFORCEMENT:
	- Server-side preference checking before delivery
	- Individual notification type controls
	- Master enable/disable override

	# DATA PRIVACY:
	- Notification history stored locally (localStorage)
	- Push subscriptions linked to authenticated users only
	- No cross-user data exposure

- ERROR HANDLING & RESILIENCE:

	# OFFLINE SUPPORT:
	- Notification history persists locally
	- Preferences cached for immediate UI response
	- Graceful degradation when push services unavailable

	# SUBSCRIPTION MANAGEMENT:
	- Automatic cleanup of invalid push subscriptions
	- Retry logic for failed deliveries
	- Fallback to notification history when push fails

	# DEBUGGING & MONITORING:
	- Comprehensive logging throughout the system
	- Queue statistics and status monitoring
	- Filter status tracking and debugging UI

- NOTIFICATION SYSTEM ARCHITECTURE:

	# CORE SERVICE WORKER PIPELINE
	- Service Worker Registration & Lifecycle
		- Location: src/serviceWorkerRegistration.ts
		- Initialization: Registers during app startup in main.tsx
		- Environment Detection: Uses isLocalhost boolean for localhost vs production handling
		- Update Logic: onupdatefound event triggers worker replacement with installingWorker.onstatechange
		- Error Handling: Comprehensive logging via @/lib/logger with catch blocks for registration failures

	- Service Worker Implementation
		- Location: public/sw.js
		- Cache Strategy: CACHE_NAME = 'navy-slate-navigator-v1' with app shell caching (/, /index.html, /manifest.json, icons)
		- Push Event Handler: Parses event.data.json() with fallback to default notification data structure
		- Deep-Link Actions: Defines actions array with 'open' and 'close' actions for notification interactions
		- Navigation Logic: notificationclick event uses clients.matchAll() to focus existing windows or clients.openWindow() with event.notification.data?.url routing

	- Deep-Link Routing System
		- Click Handler: notificationclick event in sw.js reads event.notification.data?.url for targeted navigation
		- URL Generation: notificationHistory.ts generateDeepLink() method maps notification types to routes:
			- taskCompleted → /tasks
			- rewardPurchased|rewardRedeemed → /rewards
			- punishmentPerformed → /punishments
			- ruleBroken → /rules
			- wellnessUpdated|wellnessCheckin → /wellbeing
			- messages → /messages

	# MASTER NOTIFICATION HOOK
	- Primary Interface: src/hooks/usePushNotifications.ts
	- Purpose: Unified notification delivery system coordinating all notification sending
	- Core Method: sendNotification(params: SendNotificationParams) - RECOMMENDED ENTRY POINT
	- Architecture: Orchestrates queue management, smart filtering, platform detection, and delivery
	- Logging: Centralized error tracking and delivery status logging via @/lib/logger
	- Backward Compatibility: Maintains legacy immediate-send methods alongside new queued system

	# Key Methods:
	- sendNotificationImmediately() - Direct delivery with smart filtering and history logging
	- queueNotification() - Batched delivery for non-critical notifications
	- getNotificationPriority() - Maps notification types to priority levels (critical/high/normal/low)

	# NOTIFICATION BADGE COMPONENTS
	- Dual Badge Architecture:
		- Primary Badge: src/components/common/NotificationBadge.tsx
			- Location: App header (top navigation)
			- Purpose: Main unread count display with navigation to notification center
			- Features: Bell icon with red badge, 99+ max count display, click navigation to /notifications
			- Data Source: useNotificationHistory() hook with localStorage-based unread count
		- Generic Badge: src/components/ui/notification-badge.tsx
			- Purpose: Reusable UI component for displaying count badges anywhere in the app
			- Features: Configurable count, max count (default 99), className prop, conditional rendering
			- Usage: Generic badge for any component needing notification-style count display

	# NOTIFICATION QUEUE & BATCHING SYSTEM
	- Queue Manager: src/services/notificationQueue.ts
	- Batching Logic: 5-second window (BATCH_WINDOW_MS = 5000) for grouping similar notifications
	- Rate Limiting: 10-second cooldown (RATE_LIMIT_MS = 10000) per notification type per user
	- Critical Bypass: CRITICAL_TYPES = ['ruleBroken', 'wellnessCheckin'] always send immediately
	- Batched Messages: Intelligent message composition for multiple notifications of same type

	# Batching Examples:
	- taskCompleted: "2 tasks completed: Task A, Task B (+15 points)"
	- rewardPurchased: "3 rewards purchased (-25 points total)"

	# SMART NOTIFICATION FILTERING
	- Filter Manager: src/services/smartNotificationFilter.ts
	- App Activity Detection: Tracks document visibility, focus events, and user interactions
	- Quiet Hours Support: Time-based filtering with overnight support (e.g., 22:00-08:00)
	- Priority Override: Critical and high-priority notifications bypass quiet hours
	- Activity Threshold: 5-minute inactivity window before considering user "away"

	# Database Configuration:
	- Storage: user_notification_preferences.preferences JSONB field contains quietHours object
	- Expected Schema:
		{
			"enabled": true,
			"types": { "ruleBroken": true, "messages": false },
			"quietHours": {
				"enabled": false,
				"start": "22:00",
				"end": "08:00"
			},
			"smartFilter": {
				"enableAppActivityDetection": true,
				"allowCriticalDuringQuietHours": true
			}
		}

	# NOTIFICATION HISTORY & PERSISTENCE
	- History Manager: src/services/notificationHistory.ts
	- Storage: Browser localStorage with key 'notification-history'
	- Data Structure: Array of NotificationHistoryItem objects with id, title, body, timestamp, read status, priority
	- Max History: 100 most recent notifications (maxHistorySize = 100)

	# Badge Refresh Strategy: NO REAL-TIME SYNC - uses localStorage-based unread count that updates on:
	- Component re-renders
	- Local notification history changes
	- Manual refresh actions
	- Limitation: No WebSocket or Supabase Realtime integration - badge may appear "stuck" until component refresh

	# PUSH NOTIFICATION MANAGEMENT
	- Platform Manager: src/services/pushNotificationManager.ts
	- Architecture: Factory pattern with WebPushManager and NativePushManager classes
	- Platform Detection: Uses Capacitor's @capacitor/core platform detection
	- Web Implementation: Uses web-push library with VAPID keys for browser notifications
	- Native Implementation: FCM implementation for Android push notifications

	- Subscription Management: src/hooks/usePushSubscription.ts
	- Browser Support: Checks for 'serviceWorker' in navigator and push notification support
	- Subscription Storage: user_push_subscriptions table with endpoint, p256dh, auth keys
	- Permission Handling: Uses Notification.requestPermission() with user consent flows

	# EDGE FUNCTION DELIVERY
	- Push Delivery Service: supabase/functions/send-push-notification/index.ts
	- Authentication: Requires valid Authorization: Bearer <JWT> header for all requests
	- Authorization: Verifies sender can notify target (self or linked partner via profiles.linked_partner_id)
	- Preference Checking: Validates user has notifications enabled for specific type before sending
	- Subscription Cleanup: AUTOMATIC REMOVAL - Deletes invalid subscriptions on 404/410 HTTP responses from push service
	- Web Push: Uses web-push library with VAPID authentication for browser notifications
	- Native Push: FCM implementation for Android with automatic token cleanup on invalid registrations

	# Invalid Subscription Handling:
	- if (error.statusCode === 410 || error.statusCode === 404) {
		await supabase.from('user_push_subscriptions')
		.delete().eq('id', subscription.id);
	}

	# SMART MESSAGE NOTIFICATIONS
	- Message-Specific Logic: src/hooks/useSmartMessageNotifications.ts
	- App State Integration: Uses useAppVisibility() and useLocation() to detect if user is on /messages
	- Context-Aware Filtering: Suppresses notifications when user is actively viewing messages page
	- Self-Message Prevention: Blocks notifications when sender equals receiver (user?.id === receiverId)
	- Message Preview: Truncates message content to 50 characters with "..." suffix for notification body

	# APP VISIBILITY DETECTION
	- Visibility Hook: src/hooks/useAppVisibility.ts
	- Document Visibility: Tracks document.hidden via visibilitychange event
	- Window Focus: Monitors focus/blur events for browser window state
	- Active State: isAppActive = isAppVisible && isAppFocused compound boolean
	- Integration: Used by message filtering and smart notification filtering systems

	# NOTIFICATION CENTER UI
	- Notification Center: src/pages/Notifications.tsx
	- Master Toggle: Enable/disable all push notifications with subscription management
	- Type Toggles: Individual controls for each notification type (rules, tasks, rewards, etc.)
	- Permission Handling: Browser permission request flow with status messaging
	- Settings Integration: Connected to useNotificationSettings() and usePushSubscription() hooks

	- Settings Hook: src/hooks/useNotificationSettings.ts
	- Database Storage: user_notification_preferences table with JSONB preferences column
	- Default Config: All types enabled but master notifications disabled by default
	- Type Management: updateNotificationType() for individual notification type control
	- Persistence: Automatic Supabase sync on preference changes

- RETRY & DELIVERY LIMITATIONS:
	- Current Retry Behavior: NO AUTOMATIC RETRIES
	- Failed Deliveries: Logged but not re-attempted
	- Queue Behavior: Single delivery attempt per notification
	- Error Recovery: Manual intervention required for delivery failures
	- Limitation Note: This is intentional - no background retry or exponential backoff implemented

	# Rate Limiting:
	- Per-Type Limits: 10-second cooldown between notifications of same type to same user
	- Critical Override: Rule violations and wellness check-ins bypass rate limiting
	- Batching Protection: Queue system prevents notification spam during high activity

- DATABASE SCHEMA:

	# Required Tables:
	- user_notification_preferences: JSONB preferences field for user settings
	- user_push_subscriptions: Web push subscription storage (endpoint, p256dh, auth, user_agent)
	- profiles: push_token field for native device tokens (FCM use)

	# Environment Variables (Supabase Secrets):
	- VAPID_PUBLIC_KEY: Web push VAPID public key (BJD5WZFzafCE_k0yfPyxOE5l3qQpGJKTvdxUOGvAFKCu8M-M8C7m0aJVQsL7M7gF1nFdVgKk9LpNQQmPj0F5O_4)
	- VAPID_PRIVATE_KEY: Web push VAPID private key
	- SUPABASE_URL: Database connection URL
	- SUPABASE_SERVICE_ROLE_KEY: Admin database access for edge function
	- FCM_SERVER_KEY: Firebase Cloud Messaging server key

- NOTIFICATION FLOW EXAMPLES:

	# Task Completion Flow:
	- User completes task → useToggleTaskCompletionMutation
	- Mutation success → queueTaskCompletedNotification called
	- Notification enters batching queue (5-second window)
	- If first notification of type → sends immediately, starts batch window
	- Additional completions within window → added to batch
	- Batch window expires → batched notification created and sent
	- Edge function receives request → verifies auth and preferences
	- Web push sent to partner's browser → notification displayed
	- Notification added to local history → badge count updated

	# Critical Rule Broken Flow:
	- Rule violation triggered → sendRuleBrokenNotification called
	- Bypasses all queuing and filtering → sends immediately
	- Edge function processes with high priority
	- Notification delivered regardless of app state or quiet hours
	- Added to notification history with 'critical' priority

- INTEGRATION TESTING POINTS:

	# Key Areas to Test:
	- Permission Flow: Browser permission requests in user gesture context
	- Platform Detection: Web vs native platform handling
	- Batching Logic: Multiple rapid notifications batch correctly
	- Filter Logic: App activity and quiet hours work as expected
	- Partner Authorization: Only linked partners can send/receive notifications
	- Preference Enforcement: Individual type toggles and master switch work
	- Edge Cases: Invalid subscriptions, offline scenarios, preference changes

	# Known Dependencies:
	- Service worker registration must complete before push subscriptions
	- VAPID keys must be properly configured in Supabase secrets
	- User must have linked partner for cross-user notifications
	- Browser must support modern push notification APIs

- FUTURE ENHANCEMENT AREAS:
	- Enhanced native push implementation (APNs for iOS)
	- Notification scheduling and delayed delivery
	- Rich notification content and actions
	- Push notification analytics and delivery tracking
	- Advanced batching strategies based on user behavior

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

11. NOTIFICATION SYSTEM:
- **NEVER** modify VAPID keys without updating both frontend and backend
- **NEVER** bypass notification queue for non-critical notifications
- **NEVER** modify smart filtering logic without understanding app activity detection
- **NEVER** change notification batching windows without testing impact
- **NEVER** remove partner authorization checks in edge function
- **NEVER** store notification history remotely - localStorage only
- **NEVER** modify notification priority mappings without system review

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

- "Push notifications not working"
	- Verify VAPID keys match between frontend and backend
	- Check service worker registration status
	- Ensure user has granted notification permissions
	- Verify edge function environment variables are set
	- Check notification preferences are enabled for user
	- Ensure partner linking is properly configured

- "Notification batching issues"
	- Check notification queue is processing correctly
	- Verify batching window timers are working
	- Ensure rate limiting isn't blocking notifications
	- Check critical notification bypass logic

- "Smart filtering problems"
	- Verify app activity detection is working
	- Check quiet hours configuration
	- Ensure priority mappings are correct
	- Test filter override logic for critical notifications

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
│   ├── useTasksData.ts                  # 🚨 CRITICAL - Task data wrapper
│   ├── useNotificationSettings.ts       # 🚨 CRITICAL - User notification preferences
│   ├── usePushSubscription.ts           # 🚨 CRITICAL - Push subscription management
│   ├── usePushNotifications.ts          # 🚨 CRITICAL - Master notification hook
│   ├── useSmartMessageNotifications.ts  # 🚨 CRITICAL - Message notification logic
│   └── useAppVisibility.ts              # 🚨 CRITICAL - App activity detection
├── pages/
│   ├── Tasks.tsx                        # 🚨 CRITICAL - Complex completion logic
│   ├── Rules.tsx                        # Standard pattern
│   ├── Rewards.tsx                      # Standard pattern
│   ├── Punishments.tsx                  # Standard pattern
│   ├── Notifications.tsx                # 🚨 CRITICAL - Notification settings
│   └── NotificationCenter.tsx           # 🚨 CRITICAL - Notification history
├── services/
│   ├── notificationQueue.ts             # 🚨 CRITICAL - Batching and rate limiting
│   ├── smartNotificationFilter.ts       # 🚨 CRITICAL - Context-aware filtering
│   ├── pushNotificationManager.ts       # 🚨 CRITICAL - Platform-agnostic delivery
│   └── notificationHistory.ts           # 🚨 CRITICAL - Local notification persistence
├── components/
│   ├── common/
│   │   └── NotificationBadge.tsx        # 🚨 CRITICAL - Header notification badge
│   └── ui/
│       └── notification-badge.tsx       # Generic badge component
├── utils/
│   └── image/                           # 🚨 CRITICAL - Image compression system
│       ├── compression.ts               # Core compression engine
│       ├── taskIntegration.ts           # Tasks image handling
│       ├── ruleIntegration.ts           # Rules image handling
│       ├── rewardIntegration.ts         # Rewards image handling
│       └── punishmentIntegration.ts     # Punishments image handling
├── lib/
│   ├── optimistic-mutations.ts          # 🚨 CRITICAL - Mutation system
│   └── taskUtils.ts                     # 🚨 CRITICAL - Task processing logic
├── serviceWorkerRegistration.ts         # 🚨 CRITICAL - Service worker lifecycle
└── public/
    └── sw.js                            # 🚨 CRITICAL - Service worker implementation

supabase/
└── functions/
    └── send-push-notification/
        └── index.ts                     # 🚨 CRITICAL - Server-side notification delivery
