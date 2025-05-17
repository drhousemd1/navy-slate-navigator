
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from './types';
import { useCreatePunishment } from "@/data/mutations/useCreatePunishment";
import { useRedeemPunishment } from "@/data/mutations/useRedeemPunishment"; // Kept if used by redeemPunishment, though not directly visible here
import { useDeletePunishment } from "@/data/mutations/useDeletePunishment";
import { supabase } from '@/integrations/supabase/client';
import { fetchPunishments as fetchPunishmentsData } from '@/data/punishments/queries/fetchPunishments';
import { fetchAllPunishmentHistory } from '@/data/punishments/queries/fetchAllPunishmentHistory';

export const usePunishmentOperations = () => {
  const queryClient = useQueryClient();
  
  const { mutateAsync: createPunishmentMutation } = useCreatePunishment();
  // const { mutateAsync: redeemPunishmentMutation } = useRedeemPunishment(); // Assuming redeem is handled elsewhere or to be added
  const { mutateAsync: deletePunishmentMutation } = useDeletePunishment();

  const { 
    data: punishments = [], 
    isLoading: isLoadingPunishments, 
    error: errorPunishments,
    refetch: refetchPunishments
  } = useQuery<PunishmentData[], Error>({
    queryKey: ['punishments'],
    queryFn: fetchPunishmentsData,
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

  const createPunishmentOperation = async (punishmentData: PunishmentData): Promise<string> => {
    try {
      await createPunishmentMutation({ ...punishmentData, profile_id: punishmentData.id || '' }); // profile_id might need re-evaluation based on actual needs
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['punishments'] });
      return punishmentData.id || ''; // Assuming ID is client-generated or part of input for now
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

  const updatePunishment = async (id: string, punishmentData: Partial<PunishmentData>): Promise<void> => {
    try {
      console.log("Updating punishment with ID:", id);
      console.log("Data to update:", punishmentData);
      
      const { error } = await supabase
        .from('punishments')
        .update(punishmentData)
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Punishment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['punishments'] });
      queryClient.invalidateQueries({ queryKey: ['punishments', id] }); // If individual item query exists
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
      toast({
        title: "Success",
        description: "Punishment deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['punishments'] });
      queryClient.invalidateQueries({ queryKey: ['allPunishmentHistory'] }); // History might be affected
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
        applied_date: today.toISOString(), // Ensure applied_date is set
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
      queryClient.invalidateQueries({ queryKey: ['profile_points']}); // Invalidate points if managed by react query
      
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

  return {
    punishments,
    punishmentHistory,
    loading: isLoadingPunishments || isLoadingHistory,
    error: errorPunishments || errorHistory,
    totalPointsDeducted,
    fetchPunishments: async () => { // Combined refetch for convenience
        await refetchPunishments();
        await refetchHistory();
    },
    createPunishment: createPunishmentOperation,
    updatePunishment,
    deletePunishment: deletePunishmentOperation,
    applyPunishment,
    getPunishmentHistory
  };
};
