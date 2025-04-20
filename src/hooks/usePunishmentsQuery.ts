import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { toast } from '@/hooks/use-toast';

// Keys for React Query cache
const PUNISHMENTS_KEY = 'punishments';
const PUNISHMENT_HISTORY_KEY = 'punishment_history';

// Get punishment count for loading expectations
export const getPunishmentsCount = async (): Promise<number> => {
  try {
    const { count, error } = await getSupabaseClient()
      .from('punishments')
      .select('*', { count: 'exact', head: true })
      .abortSignal(AbortSignal.timeout(3000));
    
    if (error) throw error;
    return count || 0;
  } catch (e) {
    console.error("Error fetching punishment count:", e);
    return 0;
  }
};

// Fetch all punishments
export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('punishments')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching punishments:', error);
    throw error;
  }
};

// Fetch punishment history
export const fetchPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('punishment_history')
      .select('*')
      .order('applied_date', { ascending: false })
      .limit(30); // Limit to recent history
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching punishment history:', error);
    throw error;
  }
};

// Create a new punishment
export const createPunishment = async (punishmentData: PunishmentData): Promise<PunishmentData> => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('punishments')
      .insert(punishmentData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating punishment:', error);
    throw error;
  }
};

// Update an existing punishment
export const updatePunishment = async ({ id, ...data }: PunishmentData): Promise<void> => {
  try {
    const { error } = await getSupabaseClient()
      .from('punishments')
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating punishment:', error);
    throw error;
  }
};

// Delete a punishment
export const deletePunishment = async (id: string): Promise<void> => {
  try {
    const { error } = await getSupabaseClient()
      .from('punishments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting punishment:', error);
    throw error;
  }
};

// Apply a punishment and log it to history
export const applyPunishment = async (punishmentId: string, points: number): Promise<PunishmentHistoryItem> => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const historyEntry = {
      punishment_id: punishmentId,
      day_of_week: dayOfWeek,
      points_deducted: points
    };
    
    const { data, error } = await getSupabaseClient()
      .from('punishment_history')
      .insert(historyEntry)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error applying punishment:', error);
    throw error;
  }
};

export const usePunishmentsQuery = () => {
  const queryClient = useQueryClient();
  
  // Query for fetching all punishments
  const {
    data: punishments = [],
    isLoading: loading,
    error
  } = useQuery({
    queryKey: [PUNISHMENTS_KEY],
    queryFn: fetchPunishments,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Query for fetching punishment history
  const {
    data: punishmentHistory = [],
  } = useQuery({
    queryKey: [PUNISHMENT_HISTORY_KEY],
    queryFn: fetchPunishmentHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Query for fetching count of punishments (for loading skeletons)
  const {
    data: expectedCardCount = punishments.length || 1,
  } = useQuery({
    queryKey: [PUNISHMENTS_KEY, 'count'],
    queryFn: getPunishmentsCount,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate total points deducted
  const totalPointsDeducted = punishmentHistory.reduce(
    (sum, item) => sum + item.points_deducted, 0
  );

  // Mutation for creating a punishment
  const createPunishmentMutation = useMutation({
    mutationFn: createPunishment,
    onSuccess: (newPunishment) => {
      // Update the cache with new punishment
      queryClient.setQueryData(
        [PUNISHMENTS_KEY],
        (oldData: PunishmentData[] = []) => [...oldData, newPunishment]
      );
      
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create punishment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for updating a punishment
  const updatePunishmentMutation = useMutation({
    mutationFn: updatePunishment,
    onMutate: async (updatedPunishment) => {
      // Cancel outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: [PUNISHMENTS_KEY] });
      
      // Snapshot the previous value
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>([PUNISHMENTS_KEY]) || [];
      
      // Optimistically update the cache with the new value
      queryClient.setQueryData(
        [PUNISHMENTS_KEY],
        (oldData: PunishmentData[] = []) => oldData.map(punishment => 
          punishment.id === updatedPunishment.id ? { ...punishment, ...updatedPunishment } : punishment
        )
      );
      
      // Return the previous value for rollback
      return { previousPunishments };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous value
      if (context?.previousPunishments) {
        queryClient.setQueryData([PUNISHMENTS_KEY], context.previousPunishments);
      }
      
      toast({
        title: "Error",
        description: "Failed to update punishment. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to make sure our local data is in sync with the server
      queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_KEY] });
    }
  });

  // Mutation for deleting a punishment
  const deletePunishmentMutation = useMutation({
    mutationFn: deletePunishment,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [PUNISHMENTS_KEY] });
      await queryClient.cancelQueries({ queryKey: [PUNISHMENT_HISTORY_KEY] });
      
      // Snapshot the previous values
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>([PUNISHMENTS_KEY]) || [];
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>([PUNISHMENT_HISTORY_KEY]) || [];
      
      // Optimistically update caches
      queryClient.setQueryData(
        [PUNISHMENTS_KEY],
        (oldData: PunishmentData[] = []) => oldData.filter(punishment => punishment.id !== id)
      );
      
      queryClient.setQueryData(
        [PUNISHMENT_HISTORY_KEY],
        (oldData: PunishmentHistoryItem[] = []) => oldData.filter(item => item.punishment_id !== id)
      );
      
      return { previousPunishments, previousHistory };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous values
      if (context?.previousPunishments) {
        queryClient.setQueryData([PUNISHMENTS_KEY], context.previousPunishments);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData([PUNISHMENT_HISTORY_KEY], context.previousHistory);
      }
      
      toast({
        title: "Error",
        description: "Failed to delete punishment. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PUNISHMENT_HISTORY_KEY] });
    }
  });

  // Mutation for applying a punishment
  const applyPunishmentMutation = useMutation({
    mutationFn: ({ punishmentId, points }: { punishmentId: string, points: number }) => 
      applyPunishment(punishmentId, points),
    onMutate: async ({ punishmentId, points }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [PUNISHMENT_HISTORY_KEY] });
      
      // Snapshot the previous value
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>([PUNISHMENT_HISTORY_KEY]) || [];
      
      // Get the current date for optimistic update
      const today = new Date();
      const newEntry: PunishmentHistoryItem = {
        id: `temp-${Date.now()}`,
        punishment_id: punishmentId,
        day_of_week: today.getDay(),
        applied_date: today.toISOString(),
        points_deducted: points
      };
      
      // Optimistically update the history
      queryClient.setQueryData(
        [PUNISHMENT_HISTORY_KEY],
        (oldData: PunishmentHistoryItem[] = []) => [newEntry, ...oldData]
      );
      
      return { previousHistory };
    },
    onSuccess: () => {
      toast({
        title: "Punishment Applied",
        description: "Points deducted from your total.",
        variant: "destructive",
      });
    },
    onError: (error, _, context) => {
      // Rollback to previous value
      if (context?.previousHistory) {
        queryClient.setQueryData([PUNISHMENT_HISTORY_KEY], context.previousHistory);
      }
      
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [PUNISHMENT_HISTORY_KEY] });
    }
  });

  // Function to get punishment history for a specific punishment
  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };

  return {
    punishments,
    punishmentHistory,
    loading,
    error: error ? (error as Error) : null,
    expectedCardCount,
    totalPointsDeducted,
    fetchPunishments: () => queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_KEY] }),
    createPunishment: (data: PunishmentData) => createPunishmentMutation.mutateAsync(data),
    updatePunishment: (id: string, data: PunishmentData) => updatePunishmentMutation.mutateAsync({ ...data, id }),
    deletePunishment: (id: string) => deletePunishmentMutation.mutateAsync(id),
    applyPunishment: (punishmentId: string, points: number) => 
      applyPunishmentMutation.mutateAsync({ punishmentId, points }),
    getPunishmentHistory
  };
};
