
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward, CreateRewardVariables } from '../types';
import { REWARDS_QUERY_KEY } from '../queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { prepareRewardDataForSupabase } from '@/utils/image/rewardIntegration';

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useMutation<Reward, Error, CreateRewardVariables>({
    mutationFn: async (variables: CreateRewardVariables) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      const rewardData = {
        ...variables,
        user_id: subUserId
      };

      // Prepare data for Supabase storage with image metadata conversion
      const preparedData = prepareRewardDataForSupabase(rewardData);

      const { data, error } = await supabase
        .from('rewards')
        .insert(preparedData)
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
      
      toast({
        title: "Reward Created",
        description: `Successfully created ${newReward.title}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Reward",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
