import { useState, useCallback, useMemo } from 'react';
import { useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem, ApplyPunishmentArgs } from '@/contexts/punishments/types';
import { useRewards } from '@/contexts/RewardsContext';
import { convertToMondayBasedIndex } from '@/lib/utils';
import { resetPunishmentsUsageData, currentWeekKey } from '@/lib/punishmentsUtils';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

import {
  usePunishmentsQuery,
  usePunishmentHistoryQuery,
  PUNISHMENTS_QUERY_KEY,
  PUNISHMENT_HISTORY_QUERY_KEY
} from './queries';

import {
  useCreatePunishment,
  useUpdatePunishment,
  useDeletePunishment,
  useApplyPunishment,
  CreatePunishmentVariables,
  UpdatePunishmentVariables
} from './mutations';

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();
  const { user } = useAuth();

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

  const checkAndReloadPunishments = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    
    try {
      const lastWeek = localStorage.getItem("lastWeek");
      const currentWeek = currentWeekKey();
      
      if (lastWeek !== currentWeek) {
        logger.debug('[checkAndReloadPunishments] New week detected, resetting punishments usage data');
        await resetPunishmentsUsageData(user.id);
        localStorage.setItem("lastWeek", currentWeek);
        await refetchPunishments();
        await refetchHistory();
        logger.debug('[checkAndReloadPunishments] Punishments reset completed');
      }
    } catch (error) {
      logger.error('[checkAndReloadPunishments] Error checking/reloading punishments:', error);
    }
  }, [user?.id, refetchPunishments, refetchHistory]);

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

    punishmentHistory,
    isLoadingHistory,
    errorHistory,
    refetchHistory: refetchHistory as () => Promise<QueryObserverResult<PunishmentHistoryItem[], Error>>,

    savePunishment,
    deletePunishment,
    applyPunishment,

    getPunishmentById,
    getPunishmentHistory,
    selectRandomPunishment,
    isSelectingRandom,
    setIsSelectingRandom,
    selectedPunishment,
    setSelectedPunishment,
    recentlyAppliedPunishments,
    checkAndReloadPunishments,
  };
};
