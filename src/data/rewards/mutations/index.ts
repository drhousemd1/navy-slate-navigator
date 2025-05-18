// Export all mutation hooks from this index file
export * from './useCreateReward'; // Added
export * from './useUpdateReward'; // Added
export * from './useSaveReward'; // Keeps existing exports of aliased create/update
export * from './useDeleteReward';

// Consolidating Buy/Redeem hooks later. For now, keep existing ones to avoid breaking too much.
// TODO: Consolidate useBuySubReward, useBuyDomReward, useRedeemSubReward, useRedeemDomReward
// to ensure they are the correct optimistic versions and remove duplicates.
export * from './useBuySubReward'; // This is likely the older version. Needs update.
export * from './useBuyDomReward'; // This is likely the older version. Needs update.
export * from './useRedeemSubReward'; // This one seems to be an optimistic version.
export * from './useRedeemDomReward'; // This one also seems optimistic.
// export * from './useRedeemRewards'; // This likely exports older versions, review and remove/update.
