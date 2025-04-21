
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentHistoryItem } from '../types';

// Query keys
const PUNISHMENT_HISTORY_QUERY_KEY = 'punishmentHistory';
const TOTAL_POINTS_DEDUCTED_KEY = 'totalPointsDeducted';

// Function to insert a new punishment history item in Supabase
const insertPunishmentHistory = async (data: { punishment_id: string; points_deducted: number }): Promise<PunishmentHistoryItem> => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const historyEntry = {
    punishment_id: data.punishment_id,
    day_of_week: dayOfWeek,
    points_deducted: data.points_deducted,
    applied_date: today.toISOString(), // Ensure correct date format
  };

  try {
    const { data: insertedData, error } = await supabase
      .from('punishment_history')
      .insert(historyEntry)
      .select()
      .single();

    if (error) throw error;
    if (!insertedData) throw new Error('Failed to apply punishment, no data returned.');
    return insertedData;

  } catch (error) {
    console.error('Error applying punishment to history:', error);
    toast({
      title: "Database Error",
      description: "Failed to save punishment application to history.",
      variant: "destructive",
    });
    throw error;
  }
};

/**
 * Hook for applying punishments and updating history with optimistic updates.
 */
export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<PunishmentHistoryItem, Error, { punishment_id: string; points_deducted: number }>({
    mutationFn: insertPunishmentHistory,
    onMutate: async (variables) => {
      // 1. Cancel any outgoing queries for the punishment history
      await queryClient.cancelQueries({ queryKey: [PUNISHMENT_HISTORY_QUERY_KEY] });

      // 2. Snapshot the previous history and total points
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>([PUNISHMENT_HISTORY_QUERY_KEY]) || [];
      const previousTotal = queryClient.getQueryData<number>([TOTAL_POINTS_DEDUCTED_KEY]) || 0;

      // 3. Optimistically update the history
      const optimisticHistoryItem: PunishmentHistoryItem = {
        id: `temp-${Date.now()}`, // Temporary ID
        punishment_id: variables.punishment_id,
        day_of_week: new Date().getDay(),
        points_deducted: variables.points_deducted,
        applied_date: new Date().toISOString(), // Temporary date
      };

      queryClient.setQueryData<PunishmentHistoryItem[]>(
        [PUNISHMENT_HISTORY_QUERY_KEY],
        (oldData = []) => [optimisticHistoryItem, ...oldData]
      );

      // Optimistically update the total points deducted
      queryClient.setQueryData<number>(
        [TOTAL_POINTS_DEDUCTED_KEY],
        (oldTotal = 0) => oldTotal + variables.points_deducted
      );

      // 4. Return context for error rollback
      return { previousHistory, previousTotal };
    },
    onError: (err, variables, context) => {
      // 5. Rollback on error
      if (context?.previousHistory) {
        queryClient.setQueryData([PUNISHMENT_HISTORY_QUERY_KEY], context.previousHistory);
      }
      if (context?.previousTotal !== undefined) {
        queryClient.setQueryData([TOTAL_POINTS_DEDUCTED_KEY], context.previousTotal);
      }

      console.error('Error applying punishment (onError):', err);
      toast({
        title: "Error",
        description: "Failed to apply punishment. Reverting changes.",
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
        toast({
            title: "Punishment Applied",
            description: `${data.points_deducted} points deducted.`, // Use server data
            variant: "destructive",
          });
    },
    onSettled: () => {
      // 6. Invalidate the query to refetch data
      queryClient.invalidateQueries({ queryKey: [PUNISHMENT_HISTORY_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TOTAL_POINTS_DEDUCTED_KEY] });
    },
  });
};
