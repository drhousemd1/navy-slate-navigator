
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '@/contexts/punishments/types';
import { PUNISHMENTS_QUERY_KEY } from '../queries';

/**
 * Updates an existing punishment and updates the cache optimistically
 */
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
      
      toast({
        title: "Success",
        description: "Punishment updated successfully"
      });
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      return data;
    } catch (error) {
      console.error("[updatePunishmentMutation] Error:", error);
      
      // Revert cache in case of error - but don't invalidate to trigger refetch
      queryClient.invalidateQueries({ queryKey: PUNISHMENTS_QUERY_KEY });
      
      toast({
        title: "Error",
        description: "Failed to update punishment",
        variant: "destructive",
      });
      
      throw error;
    }
  };
