// Export all mutation creators from a single entry point
export * from './useCreatePunishment'; // Replaced createPunishmentMutation
export * from './useUpdatePunishment'; // Replaced updatePunishmentMutation
export * from './useDeletePunishment'; // Replaced deletePunishmentMutation

// Keep others if they are still relevant and not covered by the above
export * from './applyPunishmentMutation'; 
// The old files like createPunishmentMutation.ts, updatePunishmentMutation.ts, deletePunishmentMutation.ts
// should eventually be removed or their logic incorporated if more complex than the generic hooks allow.
// For now, the new hooks provide the standardized optimistic updates.
