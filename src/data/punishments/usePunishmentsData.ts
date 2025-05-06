import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { 
  PUNISHMENTS_QUERY_KEY, 
  PUNISHMENT_HISTORY_QUERY_KEY,
  // Import the functions with their correct export names
  fetchPunishments,
  fetchCurrentWeekPunishmentHistory,
} from './queries';
import { 
  createPunishmentMutation, 
  updatePunishmentMutation, 
  applyPunishmentMutation,
  deletePunishmentMutation
} from './mutations';
import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Custom hook for managing punishments data
 */
export const usePunishmentsData = () => {
  const queryClient = useQueryClient();
  
  // Local state for random punishment selection
  const [isSelectingRandom, setIsSelectingRandom] = useState(false);
  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentData | null>(null);
  
  // Get punishments
  const {
    data: punishments = [],
    isLoading: loading,
    error,
    refetch: refetchPunishmentsOriginal
  } = useQuery({
    queryKey: PUNISHMENTS_QUERY_KEY,
    queryFn: fetchPunishments,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  
  // Get punishment history
  const {
    data: punishmentHistory = [],
    isLoading: historyLoading,
    refetch: refetchHistoryOriginal
  } = useQuery({
    queryKey: PUNISHMENT_HISTORY_QUERY_KEY,
    queryFn: fetchCurrentWeekPunishmentHistory,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  
  // Memoize refetch functions to avoid unnecessary rerenders
  const refetchPunishments = useCallback(
    async (options?: RefetchOptions) => refetchPunishmentsOriginal(options),
    [refetchPunishmentsOriginal]
  );
  
  const refetchHistory = useCallback(
    async (options?: RefetchOptions) => refetchHistoryOriginal(options),
    [refetchHistoryOriginal]
  );
  
  // Calculate total points deducted
  const totalPointsDeducted = (punishmentHistory as PunishmentHistoryItem[]).reduce(
    (sum, item) => sum + item.points_deducted, 
    0
  );
  
  // Initial data fetch
  const fetchPunishments = useCallback(async () => {
    try {
      await refetchPunishments();
      await refetchHistory();
    } catch (err) {
      console.error("Error fetching punishments:", err);
    }
  }, [refetchPunishments, refetchHistory]);
  
  // Create punishment mutation
  const createPunishmentMutate = useMutation({
    mutationFn: createPunishmentMutation(queryClient),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
    },
    onError: (error) => {
      console.error("Error creating punishment:", error);
      toast({
        title: "Error",
        description: "Failed to create punishment",
        variant: "destructive",
      });
    }
  });
  
  // Update punishment mutation
  const updatePunishmentMutate = useMutation({
    mutationFn: updatePunishmentMutation(queryClient),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating punishment:", error);
      toast({
        title: "Error",
        description: "Failed to update punishment",
        variant: "destructive",
      });
    }
  });
  
  // Delete punishment mutation
  const deletePunishmentMutate = useMutation({
    mutationFn: deletePunishmentMutation(queryClient),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting punishment:", error);
      toast({
        title: "Error",
        description: "Failed to delete punishment",
        variant: "destructive",
      });
    }
  });
  
  // Apply punishment mutation
  const applyPunishmentMutate = useMutation({
    mutationFn: applyPunishmentMutation(queryClient),
    onSuccess: (data) => {
      toast({
        title: "Punishment Applied",
        description: `${data.points_deducted} points deducted`,
        variant: "destructive",
      });
    },
    onError: (error) => {
      console.error("Error applying punishment:", error);
      toast({
        title: "Error",
        description: "Failed to apply punishment",
        variant: "destructive",
      });
    }
  });
  
  // Create a new punishment
  const createPunishment = async (newPunishment: Omit<Partial<PunishmentData>, 'title'> & { title: string }): Promise<PunishmentData> => {
    try {
      // Add optimistic update here if needed
      const optimisticPunishment: PunishmentData = {
        ...newPunishment,
        id: `temp-${Date.now()}`,
        points: newPunishment.points || 0, // Ensure points is included
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Apply server-side update
      const result = await createPunishmentMutate.mutateAsync(newPunishment);
      return result;
    } catch (error) {
      console.error("Error in createPunishment:", error);
      throw error;
    }
  };
  
  // Update an existing punishment
  const updatePunishment = async (id: string, punishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
    try {
      // Fix the argument format to match the expected type
      const result = await updatePunishmentMutate.mutateAsync({ 
        id, 
        punishment: punishmentData 
      });
      return result;
    } catch (error) {
      console.error("Error in updatePunishment:", error);
      throw error;
    }
  };
  
  // Delete a punishment
  const deletePunishment = async (id: string): Promise<boolean> => {
    try {
      await deletePunishmentMutate.mutateAsync(id);
      return true; // Return true to match the type in PunishmentsProvider
    } catch (error) {
      console.error("Error in deletePunishment:", error);
      return false; // Return false on error to match the type
    }
  };
  
  // Apply a punishment
  const applyPunishment = async (punishment: PunishmentData | { id: string; points: number }): Promise<PunishmentHistoryItem> => {
    try {
      const result = await applyPunishmentMutate.mutateAsync(punishment);
      return result;
    } catch (error) {
      console.error("Error in applyPunishment:", error);
      throw error;
    }
  };
  
  // Get history for a specific punishment
  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return (punishmentHistory as PunishmentHistoryItem[]).filter(item => item.punishment_id === punishmentId);
  };
  
  // Handle random punishment selection
  const selectRandomPunishment = () => {
    setIsSelectingRandom(true);
    
    // Reset any previously selected punishment
    setSelectedPunishment(null);
    
    // Simulate selection process with a timer
    setTimeout(() => {
      if ((punishments as PunishmentData[]).length === 0) {
        toast({
          title: "Error",
          description: "No punishments available",
          variant: "destructive",
        });
        setIsSelectingRandom(false);
        return;
      }
      
      // Select a random punishment
      const randomIndex = Math.floor(Math.random() * (punishments as PunishmentData[]).length);
      setSelectedPunishment((punishments as PunishmentData[])[randomIndex]);
      setIsSelectingRandom(false);
    }, 2000); // 2 seconds delay for animation
  };
  
  // Reset random selection
  const resetRandomSelection = () => {
    setSelectedPunishment(null);
    setIsSelectingRandom(false);
  };
  
  // Auto-fetch on mount
  useEffect(() => {
    fetchPunishments();
  }, [fetchPunishments]);
  
  return {
    punishments: punishments as PunishmentData[],
    punishmentHistory: punishmentHistory as PunishmentHistoryItem[],
    loading,
    historyLoading,
    error,
    isSelectingRandom,
    selectedPunishment,
    createPunishment,
    updatePunishment,
    deletePunishment,
    applyPunishment,
    selectRandomPunishment,
    resetRandomSelection,
    fetchPunishments,
    refetchPunishments,
    refetchHistory,
    getPunishmentHistory,
    totalPointsDeducted
  };
};
