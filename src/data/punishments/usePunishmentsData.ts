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
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();
  const [localPunishments, setLocalPunishments] = useState<PunishmentData[]>([]);
  const [localPunishmentHistory, setLocalPunishmentHistory] = useState<PunishmentHistoryItem[]>([]);
  const [isSelectingRandom, setIsSelectingRandom] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);

  // Log that punishment data is being requested
  console.log("[usePunishmentsData] Initializing punishment data hooks");
  
  // Check if we have cached data already
  const cachedPunishments = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
  const cachedHistory = queryClient.getQueryData(PUNISHMENT_HISTORY_QUERY_KEY);
  
  if (cachedPunishments) {
    console.log("[usePunishmentsData] Using cached punishments data:", 
      (cachedPunishments as any[]).length, "items");
  }

  if (cachedHistory) {
    console.log("[usePunishmentsData] Using cached history data:", 
      (cachedHistory as any[]).length, "items");
  }

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

  // Update local state when server data changes
  useEffect(() => {
    if (punishments.length > 0) {
      setLocalPunishments(punishments);
    }
  }, [punishments]);

  useEffect(() => {
    if (punishmentHistory.length > 0) {
      setLocalPunishmentHistory(punishmentHistory);
    }
  }, [punishmentHistory]);

  // Setup real-time subscriptions for punishments table
  useEffect(() => {
    const punishmentsChannel = supabase
      .channel('punishments-changes')
      .on('postgres_changes', 
        {
          event: '*', 
          schema: 'public',
          table: 'punishments'
        }, 
        (payload) => {
          console.log('Real-time punishments update:', payload);
          // Instead of refetching, update local state directly
          if (payload.eventType === 'INSERT') {
            setLocalPunishments(prevPunishments => [payload.new as PunishmentData, ...prevPunishments]);
          } else if (payload.eventType === 'UPDATE') {
            setLocalPunishments(prevPunishments => 
              prevPunishments.map(p => p.id === payload.new.id ? payload.new as PunishmentData : p)
            );
          } else if (payload.eventType === 'DELETE') {
            setLocalPunishments(prevPunishments => 
              prevPunishments.filter(p => p.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Setup real-time subscriptions for punishment_history table
    const historyChannel = supabase
      .channel('punishment-history-changes')
      .on('postgres_changes', 
        {
          event: '*', 
          schema: 'public',
          table: 'punishment_history'
        }, 
        (payload) => {
          console.log('Real-time punishment history update:', payload);
          // Instead of refetching, update local state directly
          if (payload.eventType === 'INSERT') {
            setLocalPunishmentHistory(prevHistory => [payload.new as PunishmentHistoryItem, ...prevHistory]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(punishmentsChannel);
      supabase.removeChannel(historyChannel);
    };
  }, []);

  const createPunishmentMut = useMutation({
    mutationFn: createPunishmentMutation(queryClient),
    onMutate: async (newPunishment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      // Snapshot the previous state
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      
      // Create an optimistic entry
      const optimisticPunishment: PunishmentData = {
        ...newPunishment,
        id: `temp-${Date.now()}`,
        points: newPunishment.points || 0, // Ensure points is included
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Update the cache optimistically
      setLocalPunishments(prev => [optimisticPunishment, ...prev]);
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, [optimisticPunishment, ...previousPunishments]);
      
      return { previousPunishments };
    },
    onError: (err, newPunishment, context) => {
      // Revert on error
      if (context) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
        setLocalPunishments(context.previousPunishments);
      }
    }
  });

  const updatePunishmentMut = useMutation({
    mutationFn: updatePunishmentMutation(queryClient),
    onMutate: async ({ id, punishment }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      // Snapshot the previous state
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      
      // Find the punishment to update
      const punishmentToUpdate = previousPunishments.find(p => p.id === id);
      
      if (!punishmentToUpdate) {
        return { previousPunishments };
      }
      
      // Create an updated version
      const updatedPunishment = {
        ...punishmentToUpdate,
        ...punishment,
        updated_at: new Date().toISOString()
      };
      
      // Update the cache optimistically
      const updatedPunishments = previousPunishments.map(p => 
        p.id === id ? updatedPunishment : p
      );
      
      setLocalPunishments(updatedPunishments);
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, updatedPunishments);
      
      return { previousPunishments };
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
        setLocalPunishments(context.previousPunishments);
      }
    }
  });

  const applyPunishmentMut = useMutation({
    mutationFn: applyPunishmentMutation(queryClient),
    onMutate: async (punishment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      
      // Snapshot the previous state
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY) || [];
      
      // Create an optimistic history entry
      const optimisticHistoryItem: PunishmentHistoryItem = {
        id: `temp-${Date.now()}`,
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        applied_date: new Date().toISOString(),
        day_of_week: new Date().getDay()
      };
      
      // Update the cache optimistically
      setLocalPunishmentHistory(prev => [optimisticHistoryItem, ...prev]);
      queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, [optimisticHistoryItem, ...previousHistory]);
      
      return { previousHistory };
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context) {
        queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
        setLocalPunishmentHistory(context.previousHistory);
      }
    }
  });

  const deletePunishmentMut = useMutation({
    mutationFn: deletePunishmentMutation(queryClient),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      // Snapshot the previous state
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      
      // Update the cache optimistically
      const updatedPunishments = previousPunishments.filter(p => p.id !== id);
      setLocalPunishments(updatedPunishments);
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, updatedPunishments);
      
      return { previousPunishments };
    },
    onError: (err, id, context) => {
      // Revert on error
      if (context) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
        setLocalPunishments(context.previousPunishments);
      }
    }
  });

  const getPunishmentHistory = useCallback((punishmentId: string): PunishmentHistoryItem[] => {
    return localPunishmentHistory.filter(item => item.punishment_id === punishmentId);
  }, [localPunishmentHistory]);

  const totalPointsDeducted = localPunishmentHistory.reduce(
    (total, item) => total + item.points_deducted, 
    0
  );

  const refetchPunishmentsTyped = (options?: RefetchOptions) => {
    console.log("[usePunishmentsData] Explicitly refetching punishments data");
    return refetchPunishments(options) as Promise<QueryObserverResult<PunishmentData[], Error>>;
  };

  const refetchHistoryTyped = (options?: RefetchOptions) => {
    console.log("[usePunishmentsData] Explicitly refetching history data");
    return refetchHistory(options) as Promise<QueryObserverResult<PunishmentHistoryItem[], Error>>;
  };

  // Update this to not invalidate queries
  const fetchPunishmentsTyped = async (): Promise<void> => {
    console.log("[usePunishmentsData] Manually fetching fresh punishment data");
    try {
      // Just refresh the data if needed
      const startTime = performance.now();
      const newPunishments = await fetchPunishments();
      const endTime = performance.now();
      console.log(`[usePunishmentsData] Fetched punishments in ${endTime - startTime}ms`);
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, newPunishments);
      setLocalPunishments(newPunishments);
      
      const histStartTime = performance.now();
      const newHistory = await fetchCurrentWeekPunishmentHistory();
      const histEndTime = performance.now();
      console.log(`[usePunishmentsData] Fetched history in ${histEndTime - histStartTime}ms`);
      
      queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, newHistory);
      setLocalPunishmentHistory(newHistory);
    } catch (error) {
      console.error("[usePunishmentsData] Error fetching fresh data:", error);
      // On error, we don't update the cache to preserve existing data
    }
  };

  // Create a wrapper function for applyPunishment to match the context type
  const applyPunishmentWrapper = useCallback((punishment: PunishmentData | { id: string; points: number }): Promise<PunishmentHistoryItem> => {
    return applyPunishmentMut.mutateAsync(punishment as { id: string; points: number });
  }, [applyPunishmentMut]);

  // Create a wrapper function that adapts to the expected interface
  const updatePunishmentWrapper = useCallback((id: string, punishment: Partial<PunishmentData>): Promise<PunishmentData> => {
    return updatePunishmentMut.mutateAsync({ id, punishment });
  }, [updatePunishmentMut]);

  const selectRandomPunishment = useCallback(() => {
    setIsSelectingRandom(true);
    
    // Simulate a random selection process
    setTimeout(() => {
      const availablePunishments = localPunishments.filter(p => p.points > 0);
      
      if (availablePunishments.length === 0) {
        setIsSelectingRandom(false);
        setSelectedPunishment(null);
        return;
      }
      
      const randomIndex = Math.floor(Math.random() * availablePunishments.length);
      setSelectedPunishment(availablePunishments[randomIndex]);
      setIsSelectingRandom(false);
    }, 1000);
  }, [localPunishments]);

  const resetRandomSelection = useCallback(() => {
    setSelectedPunishment(null);
  }, []);

  return {
    punishments: localPunishments,
    punishmentHistory: localPunishmentHistory,
    loading: punishmentsLoading && !cachedPunishments, // Only show loading if we don't have cached data
    historyLoading: historyLoading && !cachedHistory,
    error: punishmentsError || historyError,
    isSelectingRandom,
    selectedPunishment,
    createPunishment: createPunishmentMut.mutateAsync,
    updatePunishment: updatePunishmentWrapper,
    deletePunishment: deletePunishmentMut.mutateAsync,
    applyPunishment: applyPunishmentWrapper,
    selectRandomPunishment,
    resetRandomSelection,
    fetchPunishments: fetchPunishmentsTyped,
    refetchPunishments: refetchPunishmentsTyped,
    refetchHistory: refetchHistoryTyped,
    getPunishmentHistory,
    totalPointsDeducted
  };
};
