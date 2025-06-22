
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward, CreateRewardVariables } from '../types';
import { REWARDS_QUERY_KEY } from '../queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { processImageForSave } from '@/utils/image/rewardIntegration';
import { logger } from '@/lib/logger';

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  const rewardsQueryKey = [...REWARDS_QUERY_KEY, subUserId, domUserId];

  return useCreateOptimisticMutation<Reward, Error, CreateRewardVariables>({
    queryClient,
    queryKey: rewardsQueryKey,
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
    entityName: 'Reward',
    createOptimisticItem: (variables, optimisticId) => ({
      ...variables,
      id: optimisticId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: subUserId || '',
    } as Reward),
    onSuccessCallback: (newReward) => {
      logger.debug('[Create Reward] Reward created successfully with image compression');
    },
  });
};
