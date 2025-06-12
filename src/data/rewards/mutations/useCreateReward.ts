
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateRewardVariables, Reward } from '../types';
import { REWARDS_QUERY_KEY } from '../queries';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { prepareRewardDataForSupabase } from '@/utils/image/rewardIntegration';

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: CreateRewardVariables): Promise<Reward> => {
      logger.debug('[useCreateRewardMutation] Creating reward with variables:', variables);

      // Get the current user ID if not provided
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id && !variables.user_id) {
        throw new Error('User not authenticated');
      }

      // Prepare the data for Supabase using the utility function
      // Add user_id if not provided
      const rewardToInsert = prepareRewardDataForSupabase({
        title: variables.title,
        description: variables.description,
        cost: variables.cost,
        supply: variables.supply,
        is_dom_reward: variables.is_dom_reward,
        icon_name: variables.icon_name,
        icon_color: variables.icon_color,
        title_color: variables.title_color,
        subtext_color: variables.subtext_color,
        calendar_color: variables.calendar_color,
        background_image_url: variables.background_image_url,
        background_opacity: variables.background_opacity,
        highlight_effect: variables.highlight_effect,
        focal_point_x: variables.focal_point_x,
        focal_point_y: variables.focal_point_y,
        image_meta: variables.image_meta,
        user_id: variables.user_id || userData.user.id
      });

      logger.debug('[useCreateRewardMutation] Prepared data for Supabase:', rewardToInsert);

      const { data, error } = await supabase
        .from('rewards')
        .insert(rewardToInsert)
        .select()
        .single();

      if (error) {
        logger.error('[useCreateRewardMutation] Error creating reward:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from reward creation');
      }

      logger.debug('[useCreateRewardMutation] Successfully created reward:', data);
      return data as Reward;
    },
    onSuccess: (data) => {
      logger.debug('[useCreateRewardMutation] Reward created successfully:', data);
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      toast({
        title: "Success",
        description: "Reward created successfully!",
      });
    },
    onError: (error) => {
      logger.error('[useCreateRewardMutation] Error creating reward:', error);
      toast({
        title: "Error",
        description: "Failed to create reward. Please try again.",
        variant: "destructive",
      });
    },
  });
};
