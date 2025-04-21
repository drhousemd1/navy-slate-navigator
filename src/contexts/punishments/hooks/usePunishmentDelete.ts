
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '../types';

// Query key for punishments
const PUNISHMENTS_QUERY_KEY = 'punishments';
const PUNISHMENT_HISTORY_QUERY_KEY = 'punishmentHistory'; // Also invalidate history

// Function to delete a punishment in Supabase
const deletePunishmentInSupabase = async (id: string): Promise<void> => {
  try {
    // Note: Deleting related history items might need to be handled here or via DB triggers
    const { error } = await supabase
      .from('punishments')
      .delete()
      .eq('id', id);

    if (error) throw error;

  } catch (error) {
    console.error('Error deleting punishment in Supabase:', error);
    toast({
      title: "Database Error",
      description: "Failed to delete the punishment from the server.",
      variant: "destructive",
    });
    throw error;
  }
};

/**
 * Hook for deleting punishments with optimistic updates.
 */
export const useDeletePunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({ // Input is the punishment ID (string)
    mutationFn: deletePunishmentInSupabase,
    onMutate: async (punishmentIdToDelete) => {
      // 1. Cancel ongoing fetches
      await queryClient.cancelQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });

      // 2. Snapshot previous state
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>([PUNISHMENTS_QUERY_KEY]);

      // 3. Optimistically remove the punishment from the cache
      queryClient.setQueryData<PunishmentData[]>(
        [PUNISHMENTS_QUERY_KEY],
        (oldData = []) => oldData.filter(punishment => punishment.id !== punishmentIdToDelete)
      );

      // 4. Return context with snapshot
      return { previousPunishments };
    },
    onError: (err, punishmentIdToDelete, context) => {
      // 5. Rollback on error
      if (context?.previousPunishments) {
        queryClient.setQueryData([PUNISHMENTS_QUERY_KEY], context.previousPunishments);
      }
      console.error('Error deleting punishment (onError):', err);
      toast({
        title: "Error",
        description: "Failed to delete punishment. Reverting changes.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
        toast({
            title: "Success",
            description: "Punishment deleted successfully.",
        });
        // Optional: Could update history here if needed, but invalidation handles it
    },
    onSettled: () => {
      // 7. Invalidate relevant queries to re-sync
      queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PUNISHMENT_HISTORY_QUERY_KEY] }); // Invalidate history too
    },
  });
};
