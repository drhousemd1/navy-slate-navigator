
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
      // Optimistic update - add a temporary entry to the cache
      const tempId = `temp-${Date.now()}`;
      const optimisticPunishment = {
        id: tempId,
        ...newPunishment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as PunishmentData;

      // Update local cache immediately for better UI responsiveness
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => 
        [optimisticPunishment, ...old]
      );
      
      // Perform the actual API call
      const { data, error } = await supabase
        .from('punishments')
        .insert(newPunishment)
        .select()
        .single();

      if (error) throw error;
      
      // Replace optimistic entry with actual data
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) => 
        old.map(p => p.id === tempId ? data : p)
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
      
      // Remove the optimistic entry in case of error
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
        old.filter(p => !p.id.toString().startsWith('temp-'))
      );
      
      showToast("Error", "Failed to create punishment", "destructive");
      
      throw error;
    }
  };

export const updatePunishmentMutation = (queryClient: QueryClient, onSuccess?: () => void) => 
  async ({ id, punishment }: { id: string; punishment: Partial<PunishmentData> }) => {
    console.log("[updatePunishmentMutation] Updating punishment:", { id, punishment });
    const startTime = performance.now();
    
    try {
      // Get the current data for optimistic update
      const currentData = queryClient.getQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY) || [];
      const currentItem = currentData.find(p => p.id === id);
      
      if (!currentItem) throw new Error("Punishment not found in cache");
      
      // Create optimistic update
      const optimisticUpdate = {
        ...currentItem,
        ...punishment,
        updated_at: new Date().toISOString()
      };
      
      // Update cache immediately
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
        old.map(p => p.id === id ? optimisticUpdate : p)
      );
      
      // Make the actual API call
      const { data, error } = await supabase
        .from('punishments')
        .update(punishment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update cache with actual data from server
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, (old = []) =>
        old.map(p => p.id === id ? data : p)
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
      
      // Revert cache in case of error
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      showToast("Error", "Failed to update punishment", "destructive");
      
      throw error;
    }
  };

export const applyPunishmentMutation = (queryClient: QueryClient) => 
  async (punishment: { id: string; points: number }) => {
    console.log("[applyPunishmentMutation] Applying punishment:", punishment);
    const startTime = performance.now();
    
    try {
      // Create optimistic history entry
      const today = new Date();
      const tempId = `temp-${Date.now()}`;
      const optimisticHistoryEntry: PunishmentHistoryItem = {
        id: tempId,
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        day_of_week: today.getDay(),
        applied_date: today.toISOString()
      };
      
      // Update cache immediately
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        [optimisticHistoryEntry, ...old]
      );
      
      // Make the actual API call
      const historyEntry = {
        punishment_id: punishment.id,
        points_deducted: punishment.points,
        day_of_week: today.getDay()
      };
      
      const { data, error } = await supabase
        .from('punishment_history')
        .insert(historyEntry)
        .select()
        .single();

      if (error) throw error;
      
      // Update cache with actual data
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        old.map(h => h.id === tempId ? data : h)
      );
      
      const endTime = performance.now();
      console.log(`[applyPunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", "Punishment applied successfully");
      
      return data;
    } catch (error) {
      console.error("[applyPunishmentMutation] Error:", error);
      
      // Remove optimistic entry on error
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY, (old = []) => 
        old.filter(h => !h.id.toString().startsWith('temp-'))
      );
      
      showToast("Error", "Failed to apply punishment", "destructive");
      
      throw error;
    }
  };

export const deletePunishmentMutation = (queryClient: QueryClient) => 
  async (id: string) => {
    console.log("[deletePunishmentMutation] Deleting punishment:", id);
    const startTime = performance.now();
    
    try {
      // Update cache immediately (optimistic delete)
      queryClient.setQueryData<PunishmentData[]>(PUNISHMENTS_QUERY_KEY, 
        (old = []) => old.filter(p => p.id !== id)
      );
      
      // Make the actual API call
      const { error } = await supabase
        .from('punishments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Also filter history items for deleted punishment
      queryClient.setQueryData<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_QUERY_KEY,
        (old = []) => old.filter(h => h.punishment_id !== id)
      );
      
      const endTime = performance.now();
      console.log(`[deletePunishmentMutation] Operation completed in ${endTime - startTime}ms`);
      
      showToast("Success", "Punishment deleted successfully");
    } catch (error) {
      console.error("[deletePunishmentMutation] Error:", error);
      
      // Revert the cache changes in case of error
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUNISHMENT_HISTORY_QUERY_KEY });
      
      showToast("Error", "Failed to delete punishment", "destructive");
      
      throw error;
    }
  };
