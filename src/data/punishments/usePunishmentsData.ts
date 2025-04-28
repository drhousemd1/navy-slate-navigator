
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { 
  PUNISHMENTS_QUERY_KEY, 
  PUNISHMENT_HISTORY_QUERY_KEY,
  fetchPunishments,
  fetchCurrentWeekPunishmentHistory
} from './queries';
import {
  createPunishmentMutation,
  updatePunishmentMutation,
  applyPunishmentMutation,
  deletePunishmentMutation
} from './mutations';

// Centralized configuration for React Query
const QUERY_CONFIG = {
  staleTime: 1000 * 60 * 5,  // 5 minutes
  gcTime: 1000 * 60 * 30,    // 30 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: true
};

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();

  const {
    data: punishments = [],
    isLoading: punishmentsLoading,
    error: punishmentsError,
    refetch: refetchPunishments
  } = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    ...QUERY_CONFIG
  });

  const {
    data: punishmentHistory = [],
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchCurrentWeekPunishmentHistory,
    ...QUERY_CONFIG
  });

  const createPunishmentMut = useMutation({
    mutationFn: createPunishmentMutation(queryClient),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY, exact: true });
    }
  });

  const updatePunishmentMut = useMutation({
    mutationFn: updatePunishmentMutation(queryClient),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY, exact: true });
    }
  });

  const applyPunishmentMut = useMutation({
    mutationFn: applyPunishmentMutation(queryClient),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY, exact: true });
    }
  });

  const deletePunishmentMut = useMutation({
    mutationFn: deletePunishmentMutation(queryClient)
  });

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  const totalPointsDeducted = punishmentHistory.reduce(
    (total, item) => total + item.points_deducted, 
    0
  );

  const refetchPunishmentsTyped = (options?: RefetchOptions) => {
    return refetchPunishments(options) as Promise<QueryObserverResult<PunishmentData[], Error>>;
  };

  const refetchHistoryTyped = (options?: RefetchOptions) => {
    return refetchHistory(options) as Promise<QueryObserverResult<PunishmentHistoryItem[], Error>>;
  };

  const fetchPunishmentsTyped = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY })
    ]);
  };

  return {
    punishments,
    punishmentHistory,
    loading: punishmentsLoading,
    historyLoading,
    error: punishmentsError || historyError,
    isSelectingRandom: false,
    selectedPunishment: null,
    createPunishment: createPunishmentMut.mutateAsync,
    updatePunishment: (id: string, punishment: Partial<PunishmentData>) => 
      updatePunishmentMut.mutateAsync({ id, punishment }),
    deletePunishment: deletePunishmentMut.mutateAsync,
    applyPunishment: (punishment: { id: string; points: number }) => 
      applyPunishmentMut.mutateAsync(punishment),
    selectRandomPunishment: () => {},
    resetRandomSelection: () => {},
    fetchPunishments: fetchPunishmentsTyped,
    refetchPunishments: refetchPunishmentsTyped,
    refetchHistory: refetchHistoryTyped,
    getPunishmentHistory,
    totalPointsDeducted
  };
};
