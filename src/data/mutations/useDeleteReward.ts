
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient"; // queryClient is already imported, ensure it's used or remove if not directly.
import { saveRewardsToDB } from "../indexedDB/useIndexedDB";
import { Reward } from "@/lib/rewardUtils"; // Import the Reward type
import { toast } from '@/hooks/use-toast'; // Import toast

export function useDeleteReward() {
  const localQueryClient = useQueryClient(); // Renamed to avoid conflict

  return useMutation<string, Error, string, { previousRewards: Reward[] | undefined }>({
    onMutate: async (deletedRewardId: string) => {
      await localQueryClient.cancelQueries({ queryKey: ['rewards'] });

      const previousRewards = localQueryClient.getQueryData<Reward[]>(['rewards']);

      if (previousRewards) {
        const updatedRewards = previousRewards.filter(reward => reward.id !== deletedRewardId);
        localQueryClient.setQueryData<Reward[]>(['rewards'], updatedRewards);
      }
      return { previousRewards };
    },
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase.from("rewards").delete().eq("id", rewardId);
      if (error) {
        toast({
          title: 'Error Deleting Reward',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
      return rewardId;
    },
    onSuccess: async (deletedRewardId) => {
      const currentRewards = localQueryClient.getQueryData<Reward[]>(['rewards']) || [];
      try {
        await saveRewardsToDB(currentRewards);
      } catch (indexedDbError) {
        console.error('Failed to save rewards to IndexedDB after deletion:', indexedDbError);
        toast({
          title: 'Local Cache Error',
          description: 'Reward deleted from server, but failed to update local cache.',
          variant: 'default',
        });
      }

      toast({
        title: 'Reward Deleted',
        description: 'The reward has been successfully deleted.',
      });
    },
    onError: (error, deletedRewardId, context) => {
      if (context?.previousRewards) {
        localQueryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
      }
      if (!(error as Error).message.includes('Error Deleting Reward')) {
        toast({
          title: 'Deletion Failed',
          description: 'Could not delete the reward. Please try again.',
          variant: 'destructive',
        });
      }
      console.error('Error deleting reward (from onError):', (error as Error).message);
    },
    onSettled: () => {
      localQueryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
}
