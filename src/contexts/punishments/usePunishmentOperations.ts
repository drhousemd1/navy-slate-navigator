
import { useMemo } from 'react';
import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from './types';
import { useCreatePunishment, CreatePunishmentVariables } from "@/data/punishments/mutations/useCreatePunishment";
import { useUpdatePunishment } from "@/data/punishments/mutations/useUpdatePunishment"; 
import { useDeletePunishment } from "@/data/punishments/mutations/useDeletePunishment";
import { supabase } from '@/integrations/supabase/client';
import { fetchPunishments as fetchPunishmentsData } from '@/data/punishments/queries/fetchPunishments';
import { fetchAllPunishmentHistory } from '@/data/punishments/queries/fetchAllPunishmentHistory';
import { useAuth } from '@/contexts/auth'; // For user ID

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
    refetch: refetchPunishmentsFn // Renamed to avoid conflict
  } = useQuery<PunishmentData[], Error>({
    queryKey: ['punishments'],
    queryFn: fetchPunishmentsData,
    // staleTime should be handled by usePunishments hook or global config
  });

  const { 
    data: punishmentHistory = [], 
    isLoading: isLoadingHistory, 
    error: errorHistory,
    refetch: refetchHistory
  } = useQuery<PunishmentHistoryItem[], Error>({
    queryKey: ['allPunishmentHistory'],
    queryFn: fetchAllPunishmentHistory,
  });

  const totalPointsDeducted = useMemo(() => {
    return punishmentHistory.reduce((sum, item) => sum + item.points_deducted, 0);
  }, [punishmentHistory]);

  const createPunishmentOperation = async (punishmentData: Partial<Omit<PunishmentData, 'id' | 'created_at' | 'updated_at'>>): Promise<PunishmentData> => {
    try {
      if (!punishmentData.title || punishmentData.points === undefined) {
        throw new Error('Punishment must have a title and points value');
      }

      // Create a properly typed object for the CreatePunishmentVariables
      const newPunishmentData: CreatePunishmentVariables = {
        title: punishmentData.title,
        points: punishmentData.points,
        dom_supply: punishmentData.dom_supply,
        user_id: user?.id,
        // Add other properties that are in the CreatePunishmentVariables type
        ...(punishmentData.icon_name !== undefined && { icon_name: punishmentData.icon_name }),
        ...(punishmentData.icon_color !== undefined && { icon_color: punishmentData.icon_color }),
        ...(punishmentData.background_image_url !== undefined && { background_image_url: punishmentData.background_image_url }),
        ...(punishmentData.background_opacity !== undefined && { background_opacity: punishmentData.background_opacity }),
        ...(punishmentData.title_color !== undefined && { title_color: punishmentData.title_color }),
        ...(punishmentData.subtext_color !== undefined && { subtext_color: punishmentData.subtext_color }),
        ...(punishmentData.calendar_color !== undefined && { calendar_color: punishmentData.calendar_color }),
        ...(punishmentData.highlight_effect !== undefined && { highlight_effect: punishmentData.highlight_effect }),
        ...(punishmentData.focal_point_x !== undefined && { focal_point_x: punishmentData.focal_point_x }),
        ...(punishmentData.focal_point_y !== undefined && { focal_point_y: punishmentData.focal_point_y }),
        ...(punishmentData.description !== undefined && { description: punishmentData.description }),
      };
      
      const newPunishment = await createPunishmentMutation(newPunishmentData);
      queryClient.setQueryData<PunishmentData[]>(['punishments'], (oldData = []) =>
        [newPunishment, ...oldData]
      );
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

  const updatePunishmentOperation = async (id: string, punishmentData: Partial<PunishmentData>): Promise<PunishmentData> => {
    try {
      console.log("Updating punishment with ID:", id);
      console.log("Data to update:", punishmentData);
      
      // Remove user_id from the update payload to avoid errors
      const { user_id, ...updatePayload } = punishmentData;

      const updatedPunishment = await updatePunishmentMutation({ id, ...updatePayload });
      
      queryClient.setQueryData<PunishmentData[]>(['punishments'], (oldData = []) =>
        oldData.map(p => p.id === updatedPunishment.id ? updatedPunishment : p)
      );
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
      queryClient.setQueryData<PunishmentData[]>(['punishments'], (oldData = []) =>
        oldData.filter(p => p.id !== id)
      );
      // queryClient.invalidateQueries({ queryKey: ['allPunishmentHistory'] }); // History might be affected
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
      const dayOfWeek = today.getDay(); // Sunday - Saturday : 0 - 6
      
      const historyEntry = {
        punishment_id: punishmentId,
        day_of_week: dayOfWeek,
        points_deducted: points,
        applied_date: today.toISOString(),
        user_id: user?.id, // Add user_id
      };
      
      const { data, error } = await supabase
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
    return punishmentHistory.filter(item => item.punishment_id === punishmentId);
  };
  
  const refetchPunishments = async (): Promise<QueryObserverResult<PunishmentData[], Error>> => {
      await refetchHistory(); // Ensure history is fresh when punishments are refetched
      return await refetchPunishmentsFn(); // Return the result of refetching punishments
  };

  return {
    punishments,
    punishmentHistory,
    loading: isLoadingPunishments || isLoadingHistory, // Consider renaming to isLoading
    error: errorPunishments || errorHistory,
    totalPointsDeducted,
    refetchPunishments, // Changed from fetchPunishments to refetchPunishments
    createPunishment: createPunishmentOperation,
    updatePunishment: updatePunishmentOperation, // Added this
    deletePunishment: deletePunishmentOperation,
    applyPunishment,
    getPunishmentHistory,
    // Add refetchHistory if needed by provider
    isLoadingPunishments, // Expose granular loading states
    isLoadingHistory,
    errorPunishments, // Expose granular errors
    errorHistory,
  };
};
