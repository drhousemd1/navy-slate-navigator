
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward, CreateRewardVariables, UpdateRewardVariables, RewardFormValues, RawSupabaseReward } from '@/data/rewards/types';
import { parseRewardData } from '../queries';
import { REWARDS_QUERY_KEY } from './useBuyReward';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';
import { useCreateReward } from './useCreateReward';
import { useUpdateReward } from './useUpdateReward';

// This hook now acts as a dispatcher to either create or update.
export function useSaveReward() {
  const createRewardMutation = useCreateReward();
  const updateRewardMutation = useUpdateReward();

  return useMutation<Reward, Error, RewardFormValues & { id?: string }>( // Accepts RewardFormValues with optional id
    async (rewardData) => {
      if (rewardData.id) {
        // Update
        const { id, ...updateData } = rewardData;
        return updateRewardMutation.mutateAsync({ id, ...updateData });
      } else {
        // Create
        // Ensure all fields for CreateRewardVariables are present
        const createData: CreateRewardVariables = {
            ...rewardData, // Spreading RewardFormValues
            // Add any default values required by CreateRewardVariables not in RewardFormValues
            // For example, if user_id is required and not in form:
            // user_id: 'some_default_or_current_user_id', 
            // Ensure all non-nullable fields from 'rewards' table have values
            title: rewardData.title || 'Untitled Reward',
            cost: rewardData.cost || 0,
            supply: rewardData.supply || 0, // 0 might mean unlimited
            icon_color: rewardData.icon_color || '#FFFFFF',
            title_color: rewardData.title_color || '#FFFFFF',
            subtext_color: rewardData.subtext_color || '#8E9196',
            calendar_color: rewardData.calendar_color || '#7E69AB',
            background_opacity: rewardData.background_opacity ?? 100,
            highlight_effect: rewardData.highlight_effect ?? false,
            focal_point_x: rewardData.focal_point_x ?? 50,
            focal_point_y: rewardData.focal_point_y ?? 50,
        };
        return createRewardMutation.mutateAsync(createData);
      }
    },
    {
      // Generic onSuccess/onError can be defined here if needed,
      // but often specific mutations (create/update) handle their own.
      onSuccess: (data, variables) => {
        toast({
          title: variables.id ? 'Reward Updated' : 'Reward Created',
          description: `${data.title} has been saved.`,
        });
      },
      onError: (error, variables) => {
        toast({
          title: variables.id ? 'Update Failed' : 'Creation Failed',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      },
    }
  );
}
