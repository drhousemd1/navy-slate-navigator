import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';

const PUNISHMENTS_QUERY_KEY = ['punishments'];
const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'];

// Fetch punishments with joined history data
const fetchPunishmentsWithHistory = async () => {
  const [punishmentsResult, historyResult] = await Promise.all([
    supabase.from('punishments').select('*').order('created_at', { ascending: false }),
    supabase.from('punishment_history').select('*').order('applied_date', { ascending: false })
  ]);

  if (punishmentsResult.error) throw punishmentsResult.error;
  if (historyResult.error) throw historyResult.error;

  return {
    punishments: punishmentsResult.data || [],
    history: historyResult.data || []
  };
};

export const usePunishmentsData = () => {
  const queryClient = useQueryClient();

  // Optimized query with caching and background updates
  const {
    data = { punishments: [], history: [] },
    isLoading: loading,
    error
  } = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishmentsWithHistory,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false
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
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: any) => ({
        ...old,
        punishments: [
          {
            ...newPunishment,
            id: 'temp-' + Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          ...(old?.punishments || [])
        ]
      }));
      
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
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: any) => ({
        ...old,
        punishments: old.punishments.map((p: PunishmentData) =>
          p.id === id ? { ...p, ...punishment, updated_at: new Date().toISOString() } : p
        )
      }));
      
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

  // Apply punishment with optimistic update - FIX: Return void instead of the data
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
    },
    onMutate: async (punishment) => {
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      const previousData = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
      
      const newHistoryEntry = {
        id: 'temp-' + Date.now(),
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        day_of_week: new Date().getDay(),
        applied_date: new Date().toISOString()
      };

      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: any) => ({
        ...old,
        history: [newHistoryEntry, ...(old?.history || [])]
      }));
      
      return { previousData };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousData);
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

  // FIX: Change return type to void to match PunishmentsContextType
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
      const previousData = queryClient.getQueryData(PUNISHMENTS_QUERY_KEY);
      
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, (old: any) => ({
        ...old,
        punishments: old.punishments.filter((p: PunishmentData) => p.id !== id),
        history: old.history.filter((h: PunishmentHistoryItem) => h.punishment_id !== id)
      }));
      
      return { previousData };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context?.previousData);
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
    return data.history.filter(item => item.punishment_id === punishmentId);
  };

  return {
    punishments: data.punishments,
    punishmentHistory: data.history,
    loading,
    error: error as Error | null,
    isSelectingRandom: false,
    selectedPunishment: null,
    createPunishment: createPunishmentMutation.mutateAsync,
    updatePunishment: (id: string, punishment: Partial<PunishmentData>) => 
      updatePunishmentMutation.mutateAsync({ id, punishment }),
    deletePunishment: deletePunishmentMutation.mutateAsync,
    applyPunishment: applyPunishmentMutation.mutateAsync,
    selectRandomPunishment: () => {},
    resetRandomSelection: () => {},
    fetchPunishments: () => queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }),
    refetchPunishments: () => queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY }),
    refetchHistory: () => queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY }),
    getPunishmentHistory,
    totalPointsDeducted: data.history.reduce((total, item) => total + item.points_deducted, 0)
  };
};
