
// Export query keys
export const PUNISHMENTS_QUERY_KEY = ['punishments'] as const; // Use as const for stricter typing
export const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'] as const;

// Export query functions
export { fetchPunishments } from './fetchPunishments';
export { fetchCurrentWeekPunishmentHistory } from './fetchPunishmentHistory';

// Export query hooks
export { usePunishmentsQuery } from './usePunishmentsQuery';
export { usePunishmentHistoryQuery } from './usePunishmentHistoryQuery';
