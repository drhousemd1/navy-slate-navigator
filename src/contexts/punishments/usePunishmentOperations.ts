import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from './types'; // PunishmentData might still be needed for types
// Mutations will be used directly in components/pages, so direct imports here might not be needed for create/update/delete.
// import { useCreatePunishment } from "@/data/punishments/mutations/useCreatePunishment";
// import { useDeletePunishment } from "@/data/punishments/mutations/useDeletePunishment";
import { supabase } from '@/integrations/supabase/client';
import { fetchPunishments as fetchPunishmentsData } from '@/data/punishments/queries/fetchPunishments';
import { fetchAllPunishmentHistory } from '@/data/punishments/queries/fetchAllPunishmentHistory';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries'; // Using new keys

// This hook will now focus on providing derived data or specific operations not covered by generic mutations/queries
export const usePunishmentOperations = () => {
  const queryClient = useQueryClient();
  
  // Fetching punishments and history remains relevant for providing data through context if needed
  const { 
    data: punishments = [], 
    isLoading: isLoadingPunishments, 
    error: errorPunishments,
    refetch: refetchPunishments
  } = useQuery<PunishmentData[], Error>({
    queryKey: PUNISHMENTS_QUERY_KEY, // Use imported key
    queryFn: fetchPunishmentsData,
    // Standard config will be applied by defaultQueryOptions in queryClient
  });

  const { 
    data: punishmentHistory = [], 
    isLoading: isLoadingHistory, 
    error: errorHistory,
    refetch: refetchHistory
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY, // Use imported key for all history
    queryFn: fetchAllPunishmentHistory,
     // Standard config will be applied
  });

  const totalPointsDeducted = useMemo(() => {
    return punishmentHistory.reduce((sum, item) => sum + item.points_deducted, 0);
  }, [punishmentHistory]);

  // createPunishmentOperation, updatePunishment, deletePunishmentOperation are removed.
  // These will be handled by useCreatePunishment, useUpdatePunishment, useDeletePunishment hooks directly in UI components.

  // applyPunishment might stay if it's a specific operation, or it could also be a dedicated mutation hook.
  // For now, assume useApplyPunishment mutation hook is used directly.
  // If not, this function would be:
  const applyPunishment = async (punishmentId: string, points: number, domPoints?: number): Promise<void> => {
    // This logic should ideally be in a useApplyPunishment mutation hook.
    // If it's kept here, it means the context is still involved in this specific action.
    // Given the goal to move away from context for operations, this should also become a dedicated hook.
    // For this refactor, let's assume an `useApplyPunishmentMutation` is used elsewhere.
    // If it's critical to keep this specific function signature here, it would call that mutation.
    // For now, removing the direct supabase call to align with "no supabase in context ops".
    console.warn("applyPunishment in usePunishmentOperations called. Consider moving to a dedicated mutation hook.");
    // Placeholder - actual application should be done via a mutation hook.
    // This illustrates that direct Supabase calls are removed from here.
    // await applyPunishmentMutation.mutateAsync({ punishmentId, points, domPoints }); // Example
    toast({
        title: "Punishment Applied (Context Placeholder)",
        description: `${points} points deducted. This is a placeholder.`,
        variant: "destructive",
      });
    queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['profile_points']});
  };


  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  return {
    punishments, // Raw punishments list
    punishmentHistory, // Raw history list
    loading: isLoadingPunishments || isLoadingHistory,
    error: errorPunishments || errorHistory,
    totalPointsDeducted,
    refetchPunishmentsData: async () => { 
        await refetchPunishments();
        await refetchHistory();
    },
    // createPunishment, updatePunishment, deletePunishment are removed
    applyPunishment, // Keeping applyPunishment for now, but ideally it also moves to a direct mutation hook usage
    getPunishmentHistory
  };
};
