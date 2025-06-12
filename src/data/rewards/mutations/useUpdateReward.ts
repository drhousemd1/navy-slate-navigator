
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UpdateRewardVariables, Reward } from '../types';
import { REWARDS_QUERY_KEY } from '../queries';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { prepareRewardDataForSupabase } from '@/utils/image/rewardIntegration';

export const useUpdateRewardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: UpdateRewardVariables): Promise<Reward> => {
      const { id, ...updateData } = variables;
      logger.debug('[useUpdateRewardMutation] Updating reward with variables:', variables);

      // Prepare the data for Supabase using the utility function
      const updatesForSupabase = prepareRewardDataForSupabase({
        ...updateData,
        updated_at: new Date().toISOString()
      });

      logger.debug('[useUpdateRewardMutation] Prepared updates for Supabase:', updatesForSupabase);

      const { data, error } = await supabase
        .from('rewards')
        .update(updatesForSupabase)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('[useUpdateRewardMutation] Error updating reward:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from reward update');
      }

      logger.debug('[useUpdateRewardMutation] Successfully updated reward:', data);
      return data as Reward;
    },
    onSuccess: (data) => {
      logger.debug('[useUpdateRewardMutation] Reward updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      toast({
        title: "Success",
        description: "Reward updated successfully!",
      });
    },
    onError: (error) => {
      logger.error('[useUpdateRewardMutation] Error updating reward:', error);
      toast({
        title: "Error",
        description: "Failed to update reward. Please try again.",
        variant: "destructive",
      });
    },
  });
};
