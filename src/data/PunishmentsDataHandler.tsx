
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { useState } from 'react';

// Keys for queries
const PUNISHMENTS_QUERY_KEY = ['punishments'];
const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'];

// Separate function to fetch only punishments data
const fetchPunishments = async () => {
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Separate function to fetch only history data
const fetchPunishmentHistory = async () => {
  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .order('applied_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();
  const [isSelectingRandom, setIsSelectingRandom] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);

  // Optimized punishments query with increased stale time
  const {
    data: punishments = [],
    isLoading: punishmentsLoading,
    error: punishmentsError,
    refetch: refetchPunishments
  } = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    staleTime: 1000 * 60 * 20, // 20 minutes - match rewards page
    gcTime: 1000 * 60 * 30,    // 30 minutes
    refetchOnWindowFocus: false,
  });

  // Separate history query
  const {
    data: history = [],
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchPunishmentHistory,
    staleTime: 1000 * 60 * 20, // 20 minutes - match rewards page
    gcTime: 1000 * 60 * 30,    // 30 minutes
    refetchOnWindowFocus: false,
  });

  // Create punishment with optimistic update
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
      const previousPunishments = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: any) => [
        {
          ...newPunishment,
          id: 'temp-' + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        ...(old || [])
      ]);
      
      return { previousPunishments };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousPunishments);
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
      const previousPunishments = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: any) => 
        old.map((p: PunishmentData) =>
          p.id === id ? { ...p, ...punishment, updated_at: new Date().toISOString() } : p
        )
      );
      
      return { previousPunishments };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousPunishments);
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

  // Apply punishment with optimistic update
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
      const previousHistory = queryClient.getQueryData(PUNISHMENT_HISTORY_QUERY_KEY);
      
      const newHistoryEntry = {
        id: 'temp-' + Date.now(),
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        day_of_week: new Date().getDay(),
        applied_date: new Date().toISOString()
      };

      queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, (old: any) => 
        [newHistoryEntry, ...(old || [])]
      );
      
      return { previousHistory };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, context?.previousHistory);
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
    }
  });

  const deletePunishmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      const previousPunishments = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: any) => 
        old.filter((p: PunishmentData) => p.id !== id)
      );
      
      return { previousPunishments };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousPunishments);
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
    return history.filter(item => item.punishment_id === punishmentId);
  };
  
  const selectRandomPunishment = () => {
    if (punishments.length > 0) {
      setIsSelectingRandom(true);
      // Select random punishment after brief animation delay
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * punishments.length);
        setSelectedPunishment(punishments[randomIndex]);
      }, 1000);
    }
  };
  
  const resetRandomSelection = () => {
    setIsSelectingRandom(false);
    setSelectedPunishment(null);
  };

  // Return a proper async refetch function
  const fetchAllPunishmentsData = async () => {
    queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
    await refetchPunishments();
    await refetchHistory();
  };

  return {
    punishments: Array.isArray(punishments) ? punishments : [],  // Ensure it's always an array
    punishmentHistory: Array.isArray(history) ? history : [],    // Ensure it's always an array
    loading: punishmentsLoading || historyLoading,
    error: punishmentsError || historyError,
    isSelectingRandom,
    selectedPunishment,
    createPunishment: createPunishmentMutation.mutateAsync,
    updatePunishment: (id: string, punishment: Partial<PunishmentData>) => 
      updatePunishmentMutation.mutateAsync({ id, punishment }),
    deletePunishment: deletePunishmentMutation.mutateAsync,
    applyPunishment: applyPunishmentMutation.mutateAsync,
    selectRandomPunishment,
    resetRandomSelection,
    fetchPunishments: fetchAllPunishmentsData,
    refetchPunishments: fetchAllPunishmentsData,
    refetchHistory: () => refetchHistory(),
    getPunishmentHistory,
    totalPointsDeducted: history.reduce((total, item) => total + (item.points_deducted || 0), 0)
  };
};
