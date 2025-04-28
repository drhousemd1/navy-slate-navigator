
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
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';

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
    ...STANDARD_QUERY_CONFIG
  });

  const {
    data: punishmentHistory = [],
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchCurrentWeekPunishmentHistory,
    ...STANDARD_QUERY_CONFIG
  });

  const createPunishmentMut = useMutation({
    mutationFn: createPunishmentMutation(queryClient),
    // Direct cache updates in the mutation
  });

  const updatePunishmentMut = useMutation({
    mutationFn: updatePunishmentMutation(queryClient),
    // Direct cache updates in the mutation
  });

  const applyPunishmentMut = useMutation({
    mutationFn: applyPunishmentMutation(queryClient),
    // Direct cache updates in the mutation
  });

  const deletePunishmentMut = useMutation({
    mutationFn: deletePunishmentMutation(queryClient)
    // Direct cache updates in the mutation
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

  // Update this to not invalidate queries
  const fetchPunishmentsTyped = async (): Promise<void> => {
    // Instead of invalidating (which causes refetches), we just refresh the data if needed
    const newPunishments = await fetchPunishments();
    queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, newPunishments);
    
    const newHistory = await fetchCurrentWeekPunishmentHistory();
    queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, newHistory);
  };

  // Create a wrapper function that adapts to the expected interface
  const updatePunishmentWrapper = (id: string, punishment: Partial<PunishmentData>): Promise<PunishmentData> => {
    return updatePunishmentMut.mutateAsync({ id, punishment });
  };

  // Create a wrapper function for applyPunishment as well to match the context type
  const applyPunishmentWrapper = (punishment: PunishmentData | { id: string; points: number }): Promise<PunishmentHistoryItem> => {
    return applyPunishmentMut.mutateAsync(punishment as { id: string; points: number });
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
    updatePunishment: updatePunishmentWrapper,
    deletePunishment: deletePunishmentMut.mutateAsync,
    applyPunishment: applyPunishmentWrapper,
    selectRandomPunishment: () => {},
    resetRandomSelection: () => {},
    fetchPunishments: fetchPunishmentsTyped,
    refetchPunishments: refetchPunishmentsTyped,
    refetchHistory: refetchHistoryTyped,
    getPunishmentHistory,
    totalPointsDeducted
  };
};
