
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/lib/toastManager';
import { Reward, CreateRewardVariables } from '../types';
import { REWARDS_QUERY_KEY } from '../queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { processImageForSave } from '@/utils/image/rewardIntegration';
import { logger } from '@/lib/logger';

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useMutation<Reward, Error, CreateRewardVariables>({
    mutationFn: async (variables: CreateRewardVariables) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      const { processedUrl, metadata } = await processImageForSave(variables.background_image_url || null);

      const rewardData = {
        ...variables,
        background_image_url: processedUrl,
        image_meta: variables.image_meta || metadata,
        user_id: subUserId
      };

      const { data, error } = await supabase
        .from('rewards')
        .insert(rewardData)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create reward');

      return data as Reward;
    },
    onSuccess: (newReward) => {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => [
        newReward,
        ...oldRewards
      ]);
      
      toastManager.success("Reward Created", `Successfully created ${newReward.title}`);
      
      logger.debug('[Create Reward] Reward created successfully with image compression');
    },
    onError: (error) => {
      logger.error('[Create Reward] Error creating reward:', error);
      toastManager.error("Failed to Create Reward", error.message);
    },
  });
};
