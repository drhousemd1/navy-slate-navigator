
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward } from '@/data/rewards/types'; // Ensure Reward type has an 'id' field

// This TItem is for the items in the cache
type RewardWithId = Reward & { id: string };

export const useDeleteReward = () => { // Renamed from useDeleteRewardMutation for consistency
  const queryClient = useQueryClient();
  
  return useDeleteOptimisticMutation<RewardWithId, Error, string>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

      if (error) {
        console.error("Error deleting reward:", error);
        // The optimistic hook will show a toast on error
        throw new Error(error.message);
      }
      // Deletion returns no data
    },
    entityName: 'Reward',
    idField: 'id',
    // onSuccessCallback can be added if specific post-delete client logic is needed beyond cache update
  });
};
