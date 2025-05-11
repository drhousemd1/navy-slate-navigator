
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

// Query hooks
export { useTasksQuery, TASKS_QUERY_KEY } from './queries/useTasksQuery';
export { useRewardsQuery, REWARDS_QUERY_KEY } from './queries/useRewardsQuery';
export { useRulesQuery, RULES_QUERY_KEY } from './queries/useRulesQuery';
export { usePunishmentsQuery, usePunishmentHistoryQuery, PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from './queries/usePunishmentsQuery';

// Mutation hooks
export { useCompleteTask } from './mutations/useCompleteTask';
export { useCreateTask } from './mutations/useCreateTask';
export { useReorderTasks } from './mutations/useReorderTasks';
export { useBuyReward } from './mutations/useBuyReward';
export { useRedeemPunishment } from './mutations/useRedeemPunishment';

// Data hooks - to be used by components/pages
export { useTasksData } from './hooks/useTasksData';
export { useRewardsData } from './hooks/useRewardsData';
export { useRulesData } from './hooks/useRulesData';
export { usePunishmentsData } from './hooks/usePunishmentsData';

// Sync manager
export { useSyncManager, syncCardById } from './sync/useSyncManager';
