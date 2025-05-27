
// This file is being refactored to re-export the main optimistic mutation hooks
// for creating and updating rewards. This ensures that any code relying on
// useCreateRewardMutation or useUpdateRewardMutation from this file
// will now use the optimistic versions.

import { useCreateReward } from './useCreateReward'; // Importing the optimistic hook
import { useUpdateReward } from './useUpdateReward'; // Importing the optimistic hook
import { CreateRewardVariables as ActualCreateRewardVariables, UpdateRewardVariables as ActualUpdateRewardVariables } from '@/data/rewards/types';

// Re-exporting CreateRewardVariables if it was defined here, or ensuring it aligns
export type CreateRewardVariables = ActualCreateRewardVariables;
export type UpdateRewardVariables = ActualUpdateRewardVariables;


// Export the optimistic hook, potentially renaming for backward compatibility if needed,
// but using the new names directly is cleaner if possible.
// For simplicity, we'll assume direct usage of useCreateReward and useUpdateReward is preferred.

// If old names `useCreateRewardMutation` and `useUpdateRewardMutation` must be kept:
export const useCreateRewardMutation = useCreateReward;
export const useUpdateRewardMutation = useUpdateReward;

// It's generally better practice to directly import useCreateReward and useUpdateReward
// from their respective files ('./useCreateReward', './useUpdateReward') throughout the app.
// This file (`useSaveReward.ts`) might be a candidate for deprecation if all call sites
// can be updated to use the specific optimistic hooks directly.
