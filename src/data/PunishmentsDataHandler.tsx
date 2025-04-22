
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { usePunishmentToast } from '@/components/punishments/hooks/usePunishmentToast';
import { getMondayBasedDay } from '@/lib/utils';

// Keys for our queries
const PUNISHMENTS_QUERY_KEY = ['punishments'];
const PUNISHMENT_HISTORY_QUERY_KEY = ['punishment-history'];

// Fetch punishments from the database
const fetchPunishments = async (): Promise<PunishmentData[]> => {
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching punishments:', error);
    throw error;
  }

  return data.map(punishment => ({
    id: punishment.id,
    title: punishment.title,
    description: punishment.description,
    points: punishment.points,
    icon_name: punishment.icon_name,
    icon_color: punishment.icon_color,
    title_color: punishment.title_color,
    subtext_color: punishment.subtext_color,
    calendar_color: punishment.calendar_color,
    highlight_effect: punishment.highlight_effect,
    background_image_url: punishment.background_image_url,
    background_opacity: punishment.background_opacity,
    focal_point_x: punishment.focal_point_x,
    focal_point_y: punishment.focal_point_y,
    usage_data: Array(7).fill(0), // Default usage data
    created_at: punishment.created_at,
    updated_at: punishment.updated_at
  }));
};

// Fetch punishment history from the database
const fetchPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  const { data, error } = await supabase
    .from('punishment_history')
    .select('*, punishments(title)')
    .order('applied_date', { ascending: false });

  if (error) {
    console.error('Error fetching punishment history:', error);
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    punishment_id: item.punishment_id,
    applied_date: item.applied_date,
    day_of_week: item.day_of_week,
    points_deducted: item.points_deducted
  }));
};

// Create a new punishment
const createPunishmentInDb = async (punishment: Partial<PunishmentData>): Promise<PunishmentData> => {
  const { id, ...punishmentData } = punishment;
  
  const newPunishment = {
    title: punishmentData.title || 'New Punishment',
    description: punishmentData.description || '',
    points: punishmentData.points || 10,
    background_image_url: punishmentData.background_image_url,
    background_opacity: punishmentData.background_opacity || 50,
    icon_name: punishmentData.icon_name || 'Skull',
    icon_color: punishmentData.icon_color || '#ea384c',
    title_color: punishmentData.title_color || '#FFFFFF',
    subtext_color: punishmentData.subtext_color || '#8E9196',
    calendar_color: punishmentData.calendar_color || '#ea384c',
    highlight_effect: punishmentData.highlight_effect || false,
    focal_point_x: punishmentData.focal_point_x || 50,
    focal_point_y: punishmentData.focal_point_y || 50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('punishments')
    .insert(newPunishment)
    .select()
    .single();

  if (error) {
    console.error('Error creating punishment:', error);
    throw error;
  }

  return {
    ...data,
    usage_data: Array(7).fill(0)
  };
};

// Update an existing punishment
const updatePunishmentInDb = async (id: string, punishment: Partial<PunishmentData>): Promise<PunishmentData> => {
  const updateData = {
    ...punishment,
    updated_at: new Date().toISOString()
  };

  // Remove any fields that shouldn't be sent to the database
  const { usage_data, ...dataToUpdate } = updateData;

  const { data, error } = await supabase
    .from('punishments')
    .update(dataToUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating punishment:', error);
    throw error;
  }

  return {
    ...data,
    usage_data: punishment.usage_data || Array(7).fill(0)
  };
};

// Delete a punishment
const deletePunishmentFromDb = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('punishments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting punishment:', error);
    throw error;
  }
};

// Apply a punishment and record it in history
const applyPunishmentInDb = async (punishment: PunishmentData): Promise<void> => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
  const currentDay = getMondayBasedDay();
  
  // First, record the punishment in history
  const { error: historyError } = await supabase
    .from('punishment_history')
    .insert({
      punishment_id: punishment.id,
      points_deducted: punishment.points,
      applied_date: today.toISOString(),
      day_of_week: dayOfWeek
    });

  if (historyError) {
    console.error('Error recording punishment history:', historyError);
    throw historyError;
  }

  // Update the user's points
  // Note: This would require a function in Supabase, implemented as an example
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    const { error: pointsError } = await supabase
      .from('profiles')
      .update({ 
        points: supabase.rpc('calculate_points_after_deduction', { 
          user_id: userData.user.id,
          points_to_deduct: punishment.points 
        })
      })
      .eq('id', userData.user.id);

    if (pointsError) {
      console.error('Error deducting points:', pointsError);
      throw pointsError;
    }
  }
};

// The main hook to expose all punishment-related operations
export const usePunishmentsData = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = usePunishmentToast();
  const [isSelectingRandom, setIsSelectingRandom] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);

  // Query for fetching all punishments
  const { 
    data: punishments = [], 
    isLoading: loading,
    refetch: refetchPunishments
  } = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Query for fetching punishment history
  const {
    data: punishmentHistory = [],
    isLoading: historyLoading,
    refetch: refetchHistory
  } = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchPunishmentHistory,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });

  // Mutation for creating a new punishment
  const createPunishmentMutation = useMutation({
    mutationFn: createPunishmentInDb,
    onMutate: async (newPunishment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      // Snapshot the previous value
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      
      // Optimistically update the cache with the new punishment
      // Generate a temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticPunishment: PunishmentData = {
        id: tempId,
        title: newPunishment.title || 'New Punishment',
        description: newPunishment.description || '',
        points: newPunishment.points || 10,
        background_image_url: newPunishment.background_image_url,
        background_opacity: newPunishment.background_opacity || 50,
        icon_name: newPunishment.icon_name || 'Skull',
        icon_color: newPunishment.icon_color || '#ea384c',
        title_color: newPunishment.title_color || '#FFFFFF',
        subtext_color: newPunishment.subtext_color || '#8E9196',
        calendar_color: newPunishment.calendar_color || '#ea384c',
        highlight_effect: newPunishment.highlight_effect || false,
        focal_point_x: newPunishment.focal_point_x || 50,
        focal_point_y: newPunishment.focal_point_y || 50,
        usage_data: Array(7).fill(0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      queryClient.setQueryData<PunishmentData[]>(
        PUNISHMENTS_QUERY_KEY, 
        [optimisticPunishment, ...previousPunishments]
      );
      
      return { previousPunishments };
    },
    onError: (err, newPunishment, context) => {
      console.error('Error creating punishment:', err);
      showErrorToast('Failed to create punishment. Please try again.');
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
    }
  });

  // Mutation for updating an existing punishment
  const updatePunishmentMutation = useMutation({
    mutationFn: ({ id, punishment }: { id: string; punishment: Partial<PunishmentData> }) => 
      updatePunishmentInDb(id, punishment),
    onMutate: async ({ id, punishment }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      // Snapshot the previous value
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      
      // Optimistically update the cache with the updated punishment
      queryClient.setQueryData<PunishmentData[]>(
        PUNISHMENTS_QUERY_KEY, 
        previousPunishments.map(p => 
          p.id === id 
            ? { ...p, ...punishment, updated_at: new Date().toISOString() } 
            : p
        )
      );
      
      return { previousPunishments };
    },
    onError: (err, variables, context) => {
      console.error('Error updating punishment:', err);
      showErrorToast('Failed to update punishment. Please try again.');
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
    }
  });

  // Mutation for deleting a punishment
  const deletePunishmentMutation = useMutation({
    mutationFn: deletePunishmentFromDb,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      // Snapshot the previous value
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      
      // Optimistically update the cache by removing the deleted punishment
      queryClient.setQueryData<PunishmentData[]>(
        PUNISHMENTS_QUERY_KEY, 
        previousPunishments.filter(p => p.id !== id)
      );
      
      return { previousPunishments };
    },
    onError: (err, id, context) => {
      console.error('Error deleting punishment:', err);
      showErrorToast('Failed to delete punishment. Please try again.');
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
    }
  });

  // Mutation for applying a punishment
  const applyPunishmentMutation = useMutation({
    mutationFn: applyPunishmentInDb,
    onMutate: async (punishment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: ['rewards', 'points'] });
      
      // Snapshot the previous values
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      const previousHistory = queryClient.getQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY) || [];
      
      // Create a new history item
      const today = new Date();
      const newHistoryItem: PunishmentHistoryItem = {
        id: `temp-${Date.now()}`,
        punishment_id: punishment.id,
        applied_date: today.toISOString(),
        day_of_week: today.getDay(),
        points_deducted: punishment.points
      };
      
      // Optimistically update the history cache
      queryClient.setQueryData(
        PUNISHMENT_HISTORY_QUERY_KEY, 
        [newHistoryItem, ...previousHistory]
      );
      
      return { 
        previousPunishments, 
        previousHistory 
      };
    },
    onError: (err, punishment, context) => {
      console.error('Error applying punishment:', err);
      showErrorToast('Failed to apply punishment. Please try again.');
      
      // Rollback to the previous state
      if (context) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, context.previousPunishments);
        queryClient.setQueryData(PUNISHMENT_HISTORY_QUERY_KEY, context.previousHistory);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to synchronize with server state
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['rewards', 'points'] });
    }
  });

  // Random punishment selection logic
  const selectRandomPunishment = () => {
    setIsSelectingRandom(true);
    
    // Simulate delay for the random selection animation
    setTimeout(() => {
      if (punishments.length > 0) {
        const randomIndex = Math.floor(Math.random() * punishments.length);
        setSelectedPunishment(punishments[randomIndex]);
      }
      setIsSelectingRandom(false);
    }, 1000);
  };

  const resetRandomSelection = () => {
    setSelectedPunishment(null);
  };

  return {
    // Data
    punishments,
    punishmentHistory,
    isSelectingRandom,
    selectedPunishment,
    
    // Loading states
    loading,
    historyLoading,
    
    // Create, update, delete operations
    createPunishment: (punishment: Partial<PunishmentData>) => 
      createPunishmentMutation.mutateAsync(punishment),
    updatePunishment: (id: string, punishment: Partial<PunishmentData>) => 
      updatePunishmentMutation.mutateAsync({ id, punishment }),
    deletePunishment: (id: string) => 
      deletePunishmentMutation.mutateAsync(id),
    
    // Apply punishment
    applyPunishment: (punishment: PunishmentData) => 
      applyPunishmentMutation.mutateAsync(punishment),
    
    // Random punishment functionality
    selectRandomPunishment,
    resetRandomSelection,
    
    // Refetch functions
    refetchPunishments,
    refetchHistory
  };
};
