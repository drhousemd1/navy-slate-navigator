
// Export query keys
export const PUNISHMENTS_QUERY_KEY = ['punishments'] as const; // Use as const for stricter typing
export const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'] as const;

// Export query functions
export { fetchPunishments } from './fetchPunishments';
export { fetchPunishmentById } from './fetchPunishmentById'; // Added export
export { fetchCurrentWeekPunishmentHistory } from './fetchPunishmentHistory';

// Export query hooks
export { usePunishmentsQuery } from './usePunishmentsQuery';
export { usePunishmentQuery } from './usePunishmentQuery'; // Added export
export { usePunishmentHistoryQuery } from './usePunishmentHistoryQuery';
