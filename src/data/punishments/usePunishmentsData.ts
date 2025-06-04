
import { useState, useCallback, useMemo } from 'react';
import { useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { useRewards } from '@/contexts/RewardsContext';
import { convertToMondayBasedIndex } from '@/lib/utils';

import {
  usePunishmentsQuery,
  usePunishmentHistoryQuery,
  PUNISHMENTS_QUERY_KEY, // For direct cache access if needed, though mutations should handle it
  PUNISHMENT_HISTORY_QUERY_KEY
} from './queries';

import {
  useCreatePunishment,
  useUpdatePunishment,
  useDeletePunishment,
  useApplyPunishment,
  CreatePunishmentVariables, // Import variable types
  UpdatePunishmentVariables
} from './mutations';

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards(); // Still needed for applyPunishment's full impact

  // State for random punishment selection
  const [isSelectingRandom, setIsSelectingRandom] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);

  // --- Queries ---
  const {
    data: punishmentsData = [],
    isLoading: isLoadingPunishments,
    error: errorPunishments,
    refetch: refetchPunishments,
  } = usePunishmentsQuery();

  const {
    data: punishmentHistoryData = [], 
    isLoading: isLoadingHistory,
    error: errorHistory,
    refetch: refetchHistory,
  } = usePunishmentHistoryQuery();
  
  // Memoize punishments and history to prevent unnecessary re-renders if underlying data hasn't changed
  const punishments = useMemo(() => punishmentsData, [punishmentsData]);
  const punishmentHistory = useMemo(() => punishmentHistoryData, [punishmentHistoryData]);


  // --- Mutations ---
  const createPunishmentMutation = useCreatePunishment();
  const updatePunishmentMutation = useUpdatePunishment();
  const deletePunishmentMutation = useDeletePunishment();
  const applyPunishmentMutationHook = useApplyPunishment();

  const savePunishment = useCallback(async (punishmentData: CreatePunishmentVariables | UpdatePunishmentVariables) => {
    if ('id' in punishmentData && punishmentData.id) {
      return updatePunishmentMutation.mutateAsync(punishmentData as UpdatePunishmentVariables);
    }
    return createPunishmentMutation.mutateAsync(punishmentData as CreatePunishmentVariables);
  }, [createPunishmentMutation, updatePunishmentMutation]);

  const deletePunishment = useCallback(async (punishmentId: string) => {
    return deletePunishmentMutation.mutateAsync(punishmentId);
  }, [deletePunishmentMutation]);

  const applyPunishment = useCallback(async (args: ApplyPunishmentArgs) => {
    await applyPunishmentMutationHook.mutateAsync(args);
    // refreshPointsFromDatabase was originally in onSuccess of applyPunishment.
    // The useApplyPunishment hook's onSuccess now handles invalidations.
    // For direct refreshPointsFromDatabase, it might be better called after the mutation completes.
    // Or ensure CRITICAL_QUERY_KEYS.PROFILE invalidation correctly triggers points refresh elsewhere.
    // For now, let's assume invalidation is sufficient. If direct refresh is critical, it can be added here.
    // await refreshPointsFromDatabase(); // Decided to rely on invalidation by useApplyPunishment hook
  }, [applyPunishmentMutationHook]);


  // --- Helper Functions ---
  const getPunishmentById = useCallback((id: string): PunishmentData | undefined => {
    return punishments.find(p => p.id === id);
  }, [punishments]);

  const getPunishmentHistory = useCallback((punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  }, [punishmentHistory]);

  const selectRandomPunishment = useCallback((): PunishmentData | null => {
    if (punishments.length === 0) return null;
    setIsSelectingRandom(true);
    const randomIndex = Math.floor(Math.random() * punishments.length);
    const randomPunishment = punishments[randomIndex];
    setSelectedPunishment(randomPunishment);
    // setIsSelectingRandom(false) should be handled by the component using this
    return randomPunishment;
  }, [punishments]);
  
  const recentlyAppliedPunishments = useMemo(() => {
    return [...punishmentHistory]
      .sort((a, b) => new Date(b.applied_date).getTime() - new Date(a.applied_date).getTime())
      .slice(0, 5);
  }, [punishmentHistory]);
  
  const punishmentsWithUsage = useMemo(() => {
    return punishments.map(punishment => {
      const historyForPunishment = punishmentHistory.filter(h => h.punishment_id === punishment.id);
      const usage_data = [0, 0, 0, 0, 0, 0, 0]; 
      historyForPunishment.forEach(item => {
        const dayIndex = convertToMondayBasedIndex(item.day_of_week); 
        if (dayIndex >= 0 && dayIndex < 7) {
          usage_data[dayIndex] += 1; 
        }
      });
      return {
        ...punishment,
        usage_data,
        frequency_count: historyForPunishment.length,
      };
    });
  }, [punishments, punishmentHistory]);

  return {
    punishments: punishmentsWithUsage,
    isLoadingPunishments,
    errorPunishments,
    refetchPunishments: refetchPunishments as () => Promise<QueryObserverResult<PunishmentData[], Error>>,

    punishmentHistory, // Expose the raw history
    isLoadingHistory,
    errorHistory,
    refetchHistory: refetchHistory as () => Promise<QueryObserverResult<PunishmentHistoryItem[], Error>>,

    savePunishment,
    deletePunishment,
    applyPunishment,

    getPunishmentById,
    getPunishmentHistory, // Expose this for specific history needs
    selectRandomPunishment,
    isSelectingRandom,
    setIsSelectingRandom,
    selectedPunishment,
    setSelectedPunishment,
    recentlyAppliedPunishments,
  };
};
