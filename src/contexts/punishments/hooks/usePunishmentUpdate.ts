
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '../types';

// Query key for punishments
const PUNISHMENTS_QUERY_KEY = 'punishments';

// Function to update a punishment in Supabase
const updatePunishmentInSupabase = async (punishmentData: PunishmentData): Promise<PunishmentData> => {
  if (!punishmentData.id) {
    throw new Error("Punishment ID is required for update.");
  }
  const { id, ...dataToUpdate } = punishmentData;

  try {
    // Ensure background_images is handled correctly
    let backgroundImages = dataToUpdate.background_images;
    if (backgroundImages && Array.isArray(backgroundImages)) {
        backgroundImages = backgroundImages.filter((img): img is string => typeof img === 'string' && !!img);
    }
    const updatePayload = {
        ...dataToUpdate,
        background_images: backgroundImages && backgroundImages.length > 0 ? backgroundImages : null,
        carousel_timer: dataToUpdate.carousel_timer ?? 5,
    };

    const { data, error } = await supabase
      .from('punishments')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update punishment, no data returned.')

     // Ensure response structure matches PunishmentData
     return {
        ...data,
        background_images: Array.isArray(data.background_images)
          ? data.background_images.filter((img): img is string => typeof img === 'string' && !!img)
          : data.background_images ? [String(data.background_images)] : [],
        carousel_timer: typeof data.carousel_timer === 'number'
          ? data.carousel_timer
          : data.carousel_timer !== null && data.carousel_timer !== undefined
            ? Number(data.carousel_timer)
            : 5
      };

  } catch (error) {
    console.error('Error updating punishment in Supabase:', error);
    toast({
      title: "Database Error",
      description: "Failed to save punishment updates to the server.",
      variant: "destructive",
    });
    throw error;
  }
};

/**
 * Hook for updating punishments with optimistic updates.
 */
export const useUpdatePunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<PunishmentData, Error, PunishmentData>({
    mutationFn: updatePunishmentInSupabase,
    onMutate: async (updatedPunishment) => {
      // 1. Cancel ongoing fetches
      await queryClient.cancelQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });

      // 2. Snapshot previous state
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>([PUNISHMENTS_QUERY_KEY]);

      // 3. Optimistically update the cache
      queryClient.setQueryData<PunishmentData[]>(
        [PUNISHMENTS_QUERY_KEY],
        (oldData = []) => oldData.map(punishment =>
          punishment.id === updatedPunishment.id ? { ...punishment, ...updatedPunishment } : punishment
        )
      );

      // 4. Return context with snapshot
      return { previousPunishments };
    },
    onError: (err, updatedPunishment, context) => {
      // 5. Rollback on error
      if (context?.previousPunishments) {
        queryClient.setQueryData([PUNISHMENTS_QUERY_KEY], context.previousPunishments);
      }
      console.error('Error updating punishment (onError):', err);
      toast({
        title: "Error",
        description: "Failed to update punishment. Reverting changes.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables, context) => {
        // 6. Update cache with the actual server data
        //    This can be slightly more precise than just invalidating
        queryClient.setQueryData<PunishmentData[]>(
            [PUNISHMENTS_QUERY_KEY],
            (oldData = []) => oldData.map(p => p.id === data.id ? data : p)
        );
        toast({
            title: "Success",
            description: "Punishment updated successfully.",
        });
    },
    onSettled: (data, error, variables) => {
      // 7. Invalidate the query to re-sync
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });
        // Optionally invalidate specific punishment if needed, but full list is safer
        // queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_QUERY_KEY, variables.id] });
      }
    },
  });
};

