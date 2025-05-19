import { useMemo } from 'react';
import { useQueryClient, useQuery, QueryObserverResult } from '@tanstack/react-query';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from './types';
import { useCreatePunishment, CreatePunishmentVariables } from "@/data/punishments/mutations/useCreatePunishment";
import { useUpdatePunishment } from "@/data/punishments/mutations/useUpdatePunishment";
import { useDeletePunishment } from "@/data/punishments/mutations/useDeletePunishment";
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPunishmentHistory } from '@/data/punishments/queries/fetchAllPunishmentHistory';
import { useAuth } from '@/contexts/auth';
import usePunishmentsQuery from '@/data/queries/usePunishments';

export const usePunishmentOperations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { mutateAsync: createPunishmentMutation } = useCreatePunishment();
  const { mutateAsync: updatePunishmentMutation } = useUpdatePunishment();
  const { mutateAsync: deletePunishmentMutation } = useDeletePunishment();

  const {
    data: punishments = [],
    isLoading: isLoadingPunishments,
    error: errorPunishments,
    refetch: refetchPunishmentsFn
  } = usePunishmentsQuery();

  // Use useQuery directly for fetching all punishment history
  const {
    data: punishmentHistory = [],
    isLoading: isLoadingHistory,
    error: errorHistory,
    refetch: refetchHistory
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: ['allPunishmentHistory'],
    queryFn: fetchAllPunishmentHistory,
    staleTime: Infinity, // Consider appropriate staleTime
  });


  const totalPointsDeducted = useMemo(() => {
    return (punishmentHistory || []).reduce((sum, item) => sum + item.points_deducted, 0);
  }, [punishmentHistory]);

  const createPunishmentOperation = async (punishmentData: Omit<CreatePunishmentVariables, 'user_id'>): Promise<PunishmentData> => {
    try {
      if (!punishmentData.title || punishmentData.points === undefined) {
        throw new Error('Punishment must have a title and points value');
      }

      // Construct the payload for createPunishmentMutation, including user_id
      const newPunishmentPayload: CreatePunishmentVariables = {
        ...punishmentData, // Spread the incoming data
        user_id: user?.id, // Add user_id from auth context
      };

      const newPunishment = await createPunishmentMutation(newPunishmentPayload);
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
      return newPunishment;
    } catch (error) {
      console.error('Error creating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to create punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePunishmentOperation = async (id: string, rawPunishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
    try {
      console.log("Updating punishment with ID:", id);
      console.log("Data to update:", rawPunishmentData);

      const {
        // user_id, // user_id should not be part of PunishmentData from client typically
        created_at,
        id: dataId,
        // Explicitly exclude fields that shouldn't be updated or are handled by the backend
        // For example, if PunishmentData included user_id, exclude it here:
        // user_id: removedUserId, 
        ...updatePayload
      } = rawPunishmentData;


      const updatedPunishment = await updatePunishmentMutation({ id, ...updatePayload });
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });
      return updatedPunishment;
    } catch (error) {
      console.error('Error updating punishment:', error);
      toast({
        title: "Error",
        description: "Failed to update punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePunishmentOperation = async (id: string): Promise<void> => {
    try {
      await deletePunishmentMutation(id);
      // Optimistic update handled by useDeleteOptimisticMutation
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting punishment:', error);
      toast({
        title: "Error",
        description: "Failed to delete punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const applyPunishment = async (punishmentId: string, points: number): Promise<void> => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay(); 
      
      const historyEntry = {
        punishment_id: punishmentId,
        day_of_week: dayOfWeek,
        points_deducted: points,
        applied_date: today.toISOString(),
        user_id: user?.id, // Ensure user_id is correctly passed if your DB expects it
      };
      
      const { error } = await supabase
        .from('punishment_history')
        .insert(historyEntry)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Punishment Applied",
        description: `${points} points deducted.`,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['allPunishmentHistory'] });
      queryClient.invalidateQueries({ queryKey: ['profile_points']}); 
      
    } catch (error) {
      console.error('Error applying punishment:', error);
      toast({
        title: "Error",
        description: "Failed to apply punishment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getPunishmentHistory = (punishmentId: string): PunishmentHistoryItem[] => {
    return (punishmentHistory || []).filter(item => item.punishment_id === punishmentId);
  };

  const refetchPunishmentsAndHistory = async (): Promise<QueryObserverResult<PunishmentData[], Error>> => {
      // `refetchHistory` is now the refetch function from the useQuery hook for punishmentHistory
      await refetchHistory();
      return await refetchPunishmentsFn();
  };

  return {
    punishments: punishments || [],
    punishmentHistory: punishmentHistory || [],
    isLoadingPunishments,
    isLoadingHistory, // Directly from useQuery for punishmentHistory
    errorPunishments,
    errorHistory, // Directly from useQuery for punishmentHistory
    totalPointsDeducted,
    refetchPunishments: refetchPunishmentsAndHistory,
    createPunishment: createPunishmentOperation,
    updatePunishment: updatePunishmentOperation,
    deletePunishment: deletePunishmentOperation,
    applyPunishment,
    getPunishmentHistory,
  };
};
