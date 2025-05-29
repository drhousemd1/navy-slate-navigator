
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from './types';
import { supabase } from '@/integrations/supabase/client';
import { fetchPunishments as fetchPunishmentsData } from '@/data/punishments/queries/fetchPunishments';
import { fetchAllPunishmentHistory } from '@/data/punishments/queries/fetchAllPunishmentHistory';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from '@/data/punishments/queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { logger } from '@/lib/logger';

// This hook will now focus on providing derived data or specific operations not covered by generic mutations/queries
export const usePunishmentOperations = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();
  
  // Fetching punishments and history remains relevant for providing data through context if needed
  const { 
    data: punishments = [], 
    isLoading: isLoadingPunishments, 
    error: errorPunishments,
    refetch: refetchPunishments
  } = useQuery<PunishmentData[], Error>({
    queryKey: [...PUNISHMENTS_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchPunishmentsData(subUserId, domUserId),
    enabled: !!(subUserId || domUserId),
  });

  const { 
    data: punishmentHistory = [], 
    isLoading: isLoadingHistory, 
    error: errorHistory,
    refetch: refetchHistory
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: [...PUNISHMENT_HISTORY_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchAllPunishmentHistory(subUserId, domUserId),
    enabled: !!(subUserId || domUserId),
  });

  const totalPointsDeducted = useMemo(() => {
    return punishmentHistory.reduce((sum, item) => sum + item.points_deducted, 0);
  }, [punishmentHistory]);

  // Updated applyPunishment signature and placeholder implementation
  const applyPunishment = async (args: ApplyPunishmentArgs): Promise<void> => {
    logger.warn("applyPunishment in usePunishmentOperations called. This is a placeholder and does not perform the actual mutation. Ensure components use the dedicated mutation hook.", args);
    // This is a placeholder. Actual application should use useApplyPunishment mutation hook directly.
    // The toast that was here has been removed as it was redundant and causing overlap.
    // The actual mutation hook (useApplyPunishment) handles success/error toasts.
  };

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  return {
    punishments,
    punishmentHistory,
    loading: isLoadingPunishments || isLoadingHistory,
    error: errorPunishments || errorHistory,
    totalPointsDeducted,
    refetchPunishmentsData: async () => { 
        await refetchPunishments();
        await refetchHistory();
    },
    applyPunishment, // This remains a placeholder; actual mutation is separate
    getPunishmentHistory
  };
};
