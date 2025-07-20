
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward, CreateRewardVariables } from '../types';
import { getRewardsQueryKey } from '../queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { processImageForSave } from '@/utils/image/rewardIntegration';
import { logger } from '@/lib/logger';
import { saveRewardsToDB } from '@/data/indexedDB/useIndexedDB';

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  // Use the standardized query key function
  const rewardsQueryKey = getRewardsQueryKey(subUserId, domUserId);

  return useCreateOptimisticMutation<Reward, Error, CreateRewardVariables>({
    queryClient,
    queryKey: rewardsQueryKey,
    mutationFn: async (variables: CreateRewardVariables) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      const { processedUrl, metadata } = await processImageForSave(variables.background_image_url || null);

      const rewardData = {
        title: variables.title,
        description: variables.description,
        cost: variables.cost,
        supply: 0, // Supply starts at 0 and is managed automatically
        is_dom_reward: variables.is_dom_reward,
        background_image_url: processedUrl,
        background_opacity: variables.background_opacity,
        icon_name: variables.icon_name,
        icon_color: variables.icon_color,
        title_color: variables.title_color,
        subtext_color: variables.subtext_color,
        calendar_color: variables.calendar_color,
        highlight_effect: variables.highlight_effect,
        focal_point_x: variables.focal_point_x,
        focal_point_y: variables.focal_point_y,
        image_meta: variables.image_meta || metadata,
        user_id: subUserId
      };

      logger.debug('Creating reward with data:', rewardData);

      const { data, error } = await supabase
        .from('rewards')
        .insert(rewardData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating reward:', error);
        throw error;
      }
      if (!data) throw new Error('Failed to create reward');

      return data as Reward;
    },
    entityName: 'Reward',
    createOptimisticItem: (variables, optimisticId) => ({
      ...variables,
      id: optimisticId,
      supply: 0, // Supply starts at 0 and is managed automatically
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: subUserId || '',
    } as Reward),
    onSuccessCallback: async (newReward) => {
      logger.debug('[Create Reward] Reward created successfully');
      
      // Force update the cache with the new reward at the top
      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (oldData = []) => {
        const filteredData = oldData.filter(reward => reward.id !== newReward.id);
        return [newReward, ...filteredData];
      });
      
      // Update IndexedDB cache
      const updatedRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey) || [];
      await saveRewardsToDB(updatedRewards);
      
      // Force refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey: rewardsQueryKey });
    },
  });
};
