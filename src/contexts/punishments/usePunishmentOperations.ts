import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { supabase } from '@/integrations/supabase/client';
import { fetchPunishments as fetchPunishmentsData } from '@/data/punishments/queries/fetchPunishments';
import { fetchAllPunishmentHistory } from '@/data/punishments/queries/fetchAllPunishmentHistory';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { logger } from '@/lib/logger';

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
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishmentsData,
  });

  const { 
    data: punishmentHistory = [], 
    isLoading: isLoadingHistory, 
    error: errorHistory,
    refetch: refetchHistory
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchAllPunishmentHistory,
  });

  const totalPointsDeducted = useMemo(() => {
    return punishmentHistory.reduce((sum, item) => sum + item.points_deducted, 0);
  }, [punishmentHistory]);

  // Updated applyPunishment signature and placeholder implementation
  const applyPunishment = async (args: ApplyPunishmentArgs): Promise<void> => {
    logger.warn("[usePunishmentOperations] applyPunishment called. This is a placeholder and does not perform the actual mutation. Ensure components use the dedicated mutation hook.", args);
    // This is a placeholder. Actual application should use useApplyPunishmentMutation hook (likely from @/data/punishments/mutations) directly.
    // No toasts here; the mutation hook should handle them.
  };

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };
  
  const refetchPunishmentsData = useCallback(async () => {
    logger.log("[usePunishmentOperations] Refetching punishments and history data.");
    try {
      await queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      // Optional: await Promise.all([refetchPunishments(), refetchHistory()]); if direct refetch needed over invalidate
      logger.log("[usePunishmentOperations] Punishments and history refetch initiated.");
    } catch (error) {
      logger.error("[usePunishmentOperations] Error during refetchPunishmentsData:", error);
      toast({
        title: "Data Refresh Error",
        description: "Could not refresh punishment data.",
        variant: "destructive",
      });
    }
  }, [queryClient]);

  return {
    punishments,
    punishmentHistory,
    // Consolidate loading and error states if appropriate, or keep separate
    loading: isLoadingPunishments || isLoadingHistory,
    error: errorPunishments || errorHistory, // Prioritize or combine error messages if needed
    totalPointsDeducted,
    refetchPunishmentsData, // Use the new useCallback wrapped version
    applyPunishment, // This remains a placeholder; actual mutation is separate
    getPunishmentHistory
  };
};
