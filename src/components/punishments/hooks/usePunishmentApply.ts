
// Fix import path and usage of applyPunishment from the context
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentHistoryItem } from '@/contexts/PunishmentsContext';

const PUNISHMENT_HISTORY_QUERY_KEY = 'punishmentHistory';
const TOTAL_POINTS_DEDUCTED_KEY = 'totalPointsDeducted';

const insertPunishmentHistory = async (data: { punishment_id: string; points_deducted: number }): Promise<PunishmentHistoryItem> => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const historyEntry = {
    punishment_id: data.punishment_id,
    day_of_week: dayOfWeek,
    points_deducted: data.points_deducted,
    applied_date: today.toISOString(),
  };

  const { data: insertedData, error } = await supabase
    .from('punishment_history')
    .insert(historyEntry)
    .select()
    .single();

  if (error) throw error;
  if (!insertedData) throw new Error('Failed to apply punishment, no data returned.');
  return insertedData;
};

export const useApplyPunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<PunishmentHistoryItem, Error, { punishment_id: string; points_deducted: number }>({
    mutationFn: insertPunishmentHistory,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [PUNISHMENT_HISTORY_QUERY_KEY] });

      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>([PUNISHMENT_HISTORY_QUERY_KEY]) || [];
      const previousTotal = queryClient.getQueryData<number>([TOTAL_POINTS_DEDUCTED_KEY]) || 0;

      const optimisticHistoryItem: PunishmentHistoryItem = {
        id: `temp-${Date.now()}`,
        punishment_id: variables.punishment_id,
        day_of_week: new Date().getDay(),
        points_deducted: variables.points_deducted,
        applied_date: new Date().toISOString(),
      };

      queryClient.setQueryData<PunishmentHistoryItem[]>(
        [PUNISHMENT_HISTORY_QUERY_KEY],
        (oldData = []) => [optimisticHistoryItem, ...oldData]
      );

      queryClient.setQueryData<number>(
        [TOTAL_POINTS_DEDUCTED_KEY],
        (oldTotal = 0) => oldTotal + variables.points_deducted
      );

      return { previousHistory, previousTotal };
    },
    onError: (err, variables, context: any) => {
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
        description: `${data.points_deducted} points deducted.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PUNISHMENT_HISTORY_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TOTAL_POINTS_DEDUCTED_KEY] });
    },
  });
};
