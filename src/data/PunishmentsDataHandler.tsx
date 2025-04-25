
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, addDays, format } from 'date-fns';

const PUNISHMENTS_QUERY_KEY = ['punishments'];
const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'];

// Fetch only punishments list
const fetchPunishments = async () => {
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Fetch only current week's history data
const fetchCurrentWeekPunishmentHistory = async () => {
  // Calculate the start of the current week (Monday)
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const startDate = format(startOfCurrentWeek, 'yyyy-MM-dd');
  
  // We only want history from start of week to current day
  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .gte('applied_date', startDate)
    .lte('applied_date', format(today, 'yyyy-MM-dd'))
    .order('applied_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();

  // Primary query: Fetch only punishments list
  const {
    data: punishments = [],
    isLoading: punishmentsLoading,
    error: punishmentsError,
    refetch: refetchPunishments
  } = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  // Secondary query: Fetch only current week's history
  const {
    data: punishmentHistory = [],
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchCurrentWeekPunishmentHistory,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
    // Only fetch history after punishments have loaded
    enabled: !punishmentsLoading && punishments.length > 0
  });

  // Create punishment with optimistic update - FIX: Ensure title is required
  const createPunishmentMutation = useMutation({
    mutationFn: async (newPunishment: Omit<Partial<PunishmentData>, 'title'> & { title: string }) => {
      const { data, error } = await supabase
        .from('punishments')
        .insert(newPunishment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newPunishment) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      const previousData = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, [
        {
          ...newPunishment,
          id: 'temp-' + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        ...(previousData || [])
      ]);
      
      return { previousData };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousData);
      toast({
        title: "Error",
        description: "Failed to create punishment",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
    }
  });

  // Update punishment with optimistic update
  const updatePunishmentMutation = useMutation({
    mutationFn: async ({ id, punishment }: { id: string; punishment: Partial<PunishmentData> }) => {
      const { data, error } = await supabase
        .from('punishments')
        .update(punishment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, punishment }) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      const previousData = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: PunishmentData[] | undefined) =>
        (old || []).map(p =>
          p.id === id ? { ...p, ...punishment, updated_at: new Date().toISOString() } : p
        )
      );
      
      return { previousData };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousData);
      toast({
        title: "Error",
        description: "Failed to update punishment",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });
    }
  });

  // Apply punishment with optimistic update and update only current week's history
  const applyPunishmentMutation = useMutation({
    mutationFn: async (punishment: { id: string; points: number }) => {
      const historyEntry = {
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        day_of_week: new Date().getDay()
      };

      const { data, error } = await supabase
        .from('punishment_history')
        .insert(historyEntry)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (punishment) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      const previousData = queryClient.getQueryData(PUNISHMENT_HISTORY_QUERY_KEY);
      
      const newHistoryEntry = {
        id: 'temp-' + Date.now(),
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        day_of_week: new Date().getDay(),
        applied_date: new Date().toISOString()
      };

      queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, [
        newHistoryEntry,
        ...(previousData || [])
      ]);
      
      return { previousData };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, context?.previousData);
      toast({
        title: "Error",
        description: "Failed to apply punishment",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment applied successfully",
      });
      // Only invalidate history query to avoid full page reload
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
    }
  });

  // Delete punishment
  const deletePunishmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY }),
        queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY })
      ]);
      
      const previousPunishments = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
      const previousHistory = queryClient.getQueryData(PUNISHMENT_HISTORY_QUERY_KEY);
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, 
        (old: PunishmentData[] | undefined) => (old || []).filter(p => p.id !== id)
      );
      
      queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY,
        (old: PunishmentHistoryItem[] | undefined) => (old || []).filter(h => h.punishment_id !== id)
      );
      
      return { previousPunishments, previousHistory };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousPunishments);
      queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, context?.previousHistory);
      toast({
        title: "Error",
        description: "Failed to delete punishment",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
    }
  });

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  // Calculate total points deducted from the current week's history only
  const totalPointsDeducted = punishmentHistory.reduce(
    (total, item) => total + item.points_deducted, 
    0
  );

  return {
    punishments,
    punishmentHistory,
    loading: punishmentsLoading,
    historyLoading,
    error: punishmentsError || historyError,
    isSelectingRandom: false,
    selectedPunishment: null,
    createPunishment: createPunishmentMutation.mutateAsync,
    updatePunishment: (id: string, punishment: Partial<PunishmentData>) => 
      updatePunishmentMutation.mutateAsync({ id, punishment }),
    deletePunishment: deletePunishmentMutation.mutateAsync,
    applyPunishment: (punishment: { id: string; points: number }) => 
      applyPunishmentMutation.mutateAsync(punishment),
    selectRandomPunishment: () => {},
    resetRandomSelection: () => {},
    fetchPunishments: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
    },
    refetchPunishments,
    refetchHistory,
    getPunishmentHistory,
    totalPointsDeducted
  };
};
