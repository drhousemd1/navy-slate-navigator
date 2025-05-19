
import { useQueryClient } from '@tanstack/react-query';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, CreatePunishmentVariables as ContextCreatePunishmentVariables } from '../types'; // Use types from context
import { useCreatePunishment, CreatePunishmentVariables as MutationCreatePunishmentVariables } from "@/data/punishments/mutations/useCreatePunishment";
import { useUpdatePunishment } from "@/data/punishments/mutations/useUpdatePunishment";
import { useDeletePunishment } from "@/data/punishments/mutations/useDeletePunishment";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

// Helper to ensure payload matches the mutation's expected type
const mapToMutationCreateVariables = (
  contextVars: Omit<ContextCreatePunishmentVariables, 'user_id'>,
  userId?: string
): MutationCreatePunishmentVariables => {
  return {
    ...contextVars,
    user_id: userId, // Add user_id here
    // Ensure dom_supply has a default if the mutation expects it and it's not in contextVars or optional there
    dom_supply: contextVars.dom_supply ?? 0, 
  };
};


export const usePunishmentMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { mutateAsync: createPunishmentMutation } = useCreatePunishment();
  const { mutateAsync: updatePunishmentMutation } = useUpdatePunishment();
  const { mutateAsync: deletePunishmentMutation } = useDeletePunishment();

  const createPunishmentOperation = async (
    punishmentData: Omit<ContextCreatePunishmentVariables, 'user_id'>
  ): Promise<PunishmentData> => {
    try {
      if (!punishmentData.title || punishmentData.points === undefined) {
        throw new Error('Punishment must have a title and points value');
      }

      const newPunishmentPayload = mapToMutationCreateVariables(punishmentData, user?.id);
      
      const newPunishment = await createPunishmentMutation(newPunishmentPayload);
      toast({
        title: "Success",
        description: "Punishment created successfully",
      });
      return newPunishment as PunishmentData; // Cast from PunishmentWithId to PunishmentData
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
      const {
        created_at,
        id: dataId,
        // user_id might be on Partial<PunishmentData> if it's not strictly typed out for updates
        // but it shouldn't be passed to the update mutation.
        // Let's assume user_id is not part of rawPunishmentData intended for update here.
        // If it could be, it should be destructured and excluded.
        ...updatePayload 
      } = rawPunishmentData;

      // Explicitly remove user_id if it exists on updatePayload to prevent attempting to update it
      if ('user_id' in updatePayload) {
        delete (updatePayload as any).user_id;
      }

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

  const applyPunishmentOperation = async (punishmentId: string, points: number): Promise<void> => {
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

  return {
    createPunishment: createPunishmentOperation,
    updatePunishment: updatePunishmentOperation,
    deletePunishment: deletePunishmentOperation,
    applyPunishment: applyPunishmentOperation,
  };
};
