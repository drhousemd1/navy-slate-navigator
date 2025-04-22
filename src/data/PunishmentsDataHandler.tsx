
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';

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
  
  return data.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    points: item.points,
    icon_name: item.icon_name,
    icon_color: item.icon_color,
    title_color: item.title_color,
    subtext_color: item.subtext_color,
    calendar_color: item.calendar_color,
    highlight_effect: item.highlight_effect,
    background_image_url: item.background_image_url,
    background_opacity: item.background_opacity,
    focal_point_x: item.focal_point_x,
    focal_point_y: item.focal_point_y,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));
};

// Fetch punishment history from the database
const fetchPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .order('applied_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching punishment history:', error);
    throw error;
  }
  
  return data;
};

// Create a new punishment
const createPunishmentInDb = async (punishment: Partial<PunishmentData>): Promise<PunishmentData> => {
  const { data, error } = await supabase
    .from('punishments')
    .insert({
      title: punishment.title,
      description: punishment.description,
      points: punishment.points || 10,
      icon_name: punishment.icon_name,
      icon_color: punishment.icon_color || '#ea384c',
      title_color: punishment.title_color || '#FFFFFF',
      subtext_color: punishment.subtext_color || '#8E9196',
      calendar_color: punishment.calendar_color || '#ea384c',
      highlight_effect: punishment.highlight_effect || false,
      background_image_url: punishment.background_image_url,
      background_opacity: punishment.background_opacity || 50,
      focal_point_x: punishment.focal_point_x || 50,
      focal_point_y: punishment.focal_point_y || 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating punishment:', error);
    throw error;
  }
  
  return data;
};

// Update an existing punishment
const updatePunishmentInDb = async (id: string, punishment: Partial<PunishmentData>): Promise<PunishmentData> => {
  const { data, error } = await supabase
    .from('punishments')
    .update({
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
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating punishment:', error);
    throw error;
  }
  
  return data;
};

// Delete an existing punishment
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

// Apply a punishment (record in history)
const applyPunishmentToDb = async (punishment: PunishmentData | { id: string; points: number }): Promise<void> => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  const historyEntry = {
    punishment_id: punishment.id,
    points_deducted: punishment.points,
    day_of_week: dayOfWeek,
    applied_date: today.toISOString()
  };
  
  const { error } = await supabase
    .from('punishment_history')
    .insert(historyEntry);
  
  if (error) {
    console.error('Error applying punishment:', error);
    throw error;
  }
};

// The main hook to expose all punishment-related operations
export const usePunishmentsData = () => {
  const queryClient = useQueryClient();
  const [isSelectingRandom, setIsSelectingRandom] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);
  
  // Query for fetching all punishments
  const {
    data: punishments = [],
    isLoading: loading,
    error,
    refetch: refetchPunishments
  } = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments
  });
  
  // Query for fetching punishment history
  const {
    data: punishmentHistory = [],
    isLoading: historyLoading,
    refetch: refetchHistory
  } = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchPunishmentHistory
  });
  
  // Mutation for creating a punishment
  const createPunishmentMutation = useMutation({
    mutationFn: createPunishmentInDb,
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create punishment. Please try again.",
        variant: "destructive",
      });
      console.error('Error creating punishment:', error);
    }
  });
  
  // Mutation for updating a punishment
  const updatePunishmentMutation = useMutation({
    mutationFn: ({ id, punishment }: { id: string; punishment: Partial<PunishmentData> }) => 
      updatePunishmentInDb(id, punishment),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update punishment. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating punishment:', error);
    }
  });
  
  // Mutation for deleting a punishment
  const deletePunishmentMutation = useMutation({
    mutationFn: deletePunishmentFromDb,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete punishment. Please try again.",
        variant: "destructive",
      });
      console.error('Error deleting punishment:', error);
    }
  });
  
  // Mutation for applying a punishment
  const applyPunishmentMutation = useMutation({
    mutationFn: applyPunishmentToDb,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
      console.error('Error applying punishment:', error);
    }
  });
  
  // Function to select a random punishment
  const selectRandomPunishment = () => {
    if (punishments.length === 0) {
      toast({
        title: "No Punishments",
        description: "Create some punishments first!",
        variant: "destructive",
      });
      return;
    }
    
    setIsSelectingRandom(true);
    
    // Simulate a delay for the selection animation
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * punishments.length);
      setSelectedPunishment(punishments[randomIndex]);
      setIsSelectingRandom(false);
    }, 1500);
  };
  
  // Function to reset the random selection
  const resetRandomSelection = () => {
    setSelectedPunishment(null);
  };
  
  return {
    punishments,
    punishmentHistory,
    loading,
    historyLoading,
    error,
    isSelectingRandom,
    selectedPunishment,
    createPunishment: createPunishmentMutation.mutateAsync,
    updatePunishment: (id: string, punishment: Partial<PunishmentData>) => 
      updatePunishmentMutation.mutateAsync({ id, punishment }),
    deletePunishment: deletePunishmentMutation.mutateAsync,
    applyPunishment: applyPunishmentMutation.mutateAsync,
    selectRandomPunishment,
    resetRandomSelection,
    refetchPunishments,
    refetchHistory
  };
};
