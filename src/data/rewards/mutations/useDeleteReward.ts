
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';

export const useDeleteRewardMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting reward:", error);
        throw new Error(error.message);
      }
      return null;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Success",
        description: "Reward deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
