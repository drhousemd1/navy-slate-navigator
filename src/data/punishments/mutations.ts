
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData, PunishmentHistoryItem } from '@/contexts/punishments/types';
import { PUNISHMENTS_QUERY_KEY, PUNISHMENT_HISTORY_QUERY_KEY } from './queries';

// Helper for consistent toast handling
const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
  toast({
    title,
    description,
    variant,
  });
};

export const createPunishmentMutation = (queryClient: QueryClient, onSuccess?: () => void) => 
  async (newPunishment: Omit<Partial<PunishmentData>, 'title'> & { title: string }) => {
    console.log("[createPunishmentMutation] Creating punishment:", newPunishment);
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase
        .from('punishments')
        .insert(newPunishment)
        .select()
        .single();

      if (error) throw error;
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => 
        [data, ...old]
      );
      
      const endTime = performance.now();
      console.log(`[createPunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", "Punishment created successfully");
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      return data;
    } catch (error) {
      console.error("[createPunishmentMutation] Error:", error);
      
      showToast("Error", "Failed to create punishment", "destructive");
      
      throw error;
    }
  };

export const updatePunishmentMutation = (queryClient: QueryClient, onSuccess?: () => void) => 
  async ({ id, punishment }: { id: string; punishment: Partial<PunishmentData> }) => {
    console.log("[updatePunishmentMutation] Updating punishment:", { id, punishment });
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase
        .from('punishments')
        .update(punishment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
        old.map(p =>
          p.id === id ? data : p
        )
      );
      
      const endTime = performance.now();
      console.log(`[updatePunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", "Punishment updated successfully");
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      return data;
    } catch (error) {
      console.error("[updatePunishmentMutation] Error:", error);
      
      showToast("Error", "Failed to update punishment", "destructive");
      
      throw error;
    }
  };

export const applyPunishmentMutation = (queryClient: QueryClient) => 
  async (punishment: { id: string; points: number }) => {
    console.log("[applyPunishmentMutation] Applying punishment:", punishment);
    const startTime = performance.now();
    
    try {
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
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [data, ...old]
      );
      
      const endTime = performance.now();
      console.log(`[applyPunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", "Punishment applied successfully");
      
      return data;
    } catch (error) {
      console.error("[applyPunishmentMutation] Error:", error);
      
      showToast("Error", "Failed to apply punishment", "destructive");
      
      throw error;
    }
  };

export const deletePunishmentMutation = (queryClient: QueryClient) => 
  async (id: string) => {
    console.log("[deletePunishmentMutation] Deleting punishment:", id);
    const startTime = performance.now();
    
    try {
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update cache directly for immediate UI feedback
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, 
        (old = []) => old.filter(p => p.id !== id)
      );
      
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY,
        (old = []) => old.filter(h => h.punishment_id !== id)
      );
      
      const endTime = performance.now();
      console.log(`[deletePunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", "Punishment deleted successfully");
    } catch (error) {
      console.error("[deletePunishmentMutation] Error:", error);
      
      showToast("Error", "Failed to delete punishment", "destructive");
      
      throw error;
    }
  };
