
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { useUserIds } from '@/contexts/UserIdsContext';

interface RedeemPunishmentArgs {
  punishmentId: string;
  profileId: string;
  weekData: { day: number; week: string }[];
  pointsDeducted: number;
}

export const useRedeemPunishment = () => {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useMutation({
    mutationFn: async ({ punishmentId, weekData, pointsDeducted }: RedeemPunishmentArgs) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      const historyEntries = weekData.map(({ day, week }) => ({
        punishment_id: punishmentId,
        user_id: subUserId,
        day_of_week: day,
        points_deducted: pointsDeducted,
        applied_date: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('punishment_history')
        .insert(historyEntries)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      toast({
        title: "Punishment Applied",
        description: "Punishment has been successfully applied to your history."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Apply Punishment",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};
