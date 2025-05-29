
// Export all mutation hooks from this index file
export { useCreateRewardMutation as useCreateReward } from './useCreateReward';
export { useUpdateReward } from './useUpdateReward';
export { useCreateRewardMutation, useUpdateRewardMutation } from './useSaveReward'; // Keep aliases for backwards compatibility
export * from './useDeleteReward';

// Consolidated Buy/Redeem hooks:
export * from './useBuySubReward';   // Now points to the enhanced version in this directory
export * from './useBuyDomReward';   // Now points to the enhanced version in this directory
export * from './useRedeemSubReward';// Points to the version in this directory (already good)
export * from './useRedeemDomReward';// Points to the version in this directory (already good)
