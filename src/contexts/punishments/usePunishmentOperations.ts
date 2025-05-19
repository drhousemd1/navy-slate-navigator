
import { useMemo } from 'react';
import { useQueryClient, QueryObserverResult } from '@tanstack/react-query'; // Removed useQuery from here as it's not directly used for fetching punishments list in this hook anymore
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from './types';
import { useCreatePunishment, CreatePunishmentVariables } from "@/data/punishments/mutations/useCreatePunishment";
import { useUpdatePunishment } from "@/data/punishments/mutations/useUpdatePunishment"; 
import { useDeletePunishment } from "@/data/punishments/mutations/useDeletePunishment";
import { supabase } from '@/integrations/supabase/client';
// fetchPunishmentsData is now fetched by the usePunishmentsQuery hook directly.
// import { fetchPunishments as fetchPunishmentsData } from '@/data/punishments/queries/fetchPunishments'; 
import { fetchAllPunishmentHistory } from '@/data/punishments/queries/fetchAllPunishmentHistory';
import { useAuth } from '@/contexts/auth'; // For user ID
import usePunishmentsQuery from '@/data/queries/usePunishments'; // Import the dedicated hook

export const usePunishmentOperations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { mutateAsync: createPunishmentMutation } = useCreatePunishment();
  const { mutateAsync: updatePunishmentMutation } = useUpdatePunishment();
  const { mutateAsync: deletePunishmentMutation } = useDeletePunishment();

  // Use the dedicated query hook for punishments
  const { 
    data: punishments = [], 
    isLoading: isLoadingPunishments, 
    error: errorPunishments,
    refetch: refetchPunishmentsFn 
  } = usePunishmentsQuery(); // Using the dedicated hook

  const { 
    data: punishmentHistory = [], 
    isLoading: isLoadingHistory, 
    error: errorHistory,
    refetch: refetchHistory
  } = useQueryClient().getQueryState<PunishmentHistoryItem[], Error>(['allPunishmentHistory']) // Adjusted to get state or use useQuery if preferred
    ? useQueryClient().getQueryState<PunishmentHistoryItem[], Error>(['allPunishmentHistory'])! // Added non-null assertion, ensure query is run elsewhere or initialized
    : { data: [], isLoading: true, error: null, refetch: async () => queryClient.refetchQueries({ queryKey: ['allPunishmentHistory'] }) }; // Basic fallback

  // If using useQuery directly for history is preferred:
  // const { 
  //   data: punishmentHistory = [], 
  //   isLoading: isLoadingHistory, 
  //   error: errorHistory,
  //   refetch: refetchHistory
  // } = useQuery<PunishmentHistoryItem[], Error>({
  //   queryKey: ['allPunishmentHistory'],
  //   queryFn: fetchAllPunishmentHistory,
  // });


  const totalPointsDeducted = useMemo(() => {
    return (punishmentHistory || []).reduce((sum, item) => sum + item.points_deducted, 0);
  }, [punishmentHistory]);

  const createPunishmentOperation = async (punishmentData: Partial<Omit<PunishmentData, 'id' | 'created_at' | 'updated_at'>>): Promise<PunishmentData> => {
    try {
      if (!punishmentData.title || punishmentData.points === undefined) {
        throw new Error('Punishment must have a title and points value');
      }

      const newPunishmentData: CreatePunishmentVariables = {
        title: punishmentData.title,
        points: punishmentData.points,
        dom_supply: punishmentData.dom_supply ?? 0,
        user_id: user?.id, // Ensure user_id is correctly passed
        description: punishmentData.description,
        icon_name: punishmentData.icon_name,
        icon_color: punishmentData.icon_color,
        background_image_url: punishmentData.background_image_url,
        background_opacity: punishmentData.background_opacity,
        title_color: punishmentData.title_color,
        subtext_color: punishmentData.subtext_color,
        calendar_color: punishmentData.calendar_color,
        highlight_effect: punishmentData.highlight_effect,
        focal_point_x: punishmentData.focal_point_x,
        focal_point_y: punishmentData.focal_point_y,
      };
      
      const newPunishment = await createPunishmentMutation(newPunishmentData);
      // Optimistic update handled by useCreateOptimisticMutation
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
      
      // Explicitly destructure to remove properties that shouldn't be in the update payload
      // or are handled differently (like 'id').
      const { 
        user_id,        // Should not be updated
        created_at,     // Should not be updated
        id: dataId,     // The 'id' from the data object, not to be confused with the 'id' parameter
        ...updatePayload // The rest of the properties are valid for update
      } = rawPunishmentData;

      // Ensure `updatePayload` doesn't contain undefined keys if they were destructured but not present in rawPunishmentData.
      // The spread `...updatePayload` handles this correctly.

      const updatedPunishment = await updatePunishmentMutation({ id, ...updatePayload });
      // Optimistic update handled by useUpdateOptimisticMutation
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
        user_id: user?.id,
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
      await queryClient.refetchQueries({ queryKey: ['allPunishmentHistory'] });
      return await refetchPunishmentsFn(); 
  };

  return {
    punishments: punishments || [], // Ensure punishments is always an array
    punishmentHistory: punishmentHistory || [], // Ensure history is always an array
    // loading: isLoadingPunishments || isLoadingHistory, // Consolidated loading state
    isLoadingPunishments, 
    isLoadingHistory,
    // error: errorPunishments || errorHistory, // Consolidated error state
    errorPunishments,
    errorHistory,
    totalPointsDeducted,
    refetchPunishments: refetchPunishmentsAndHistory, 
    createPunishment: createPunishmentOperation,
    updatePunishment: updatePunishmentOperation,
    deletePunishment: deletePunishmentOperation,
    applyPunishment,
    getPunishmentHistory,
  };
};
