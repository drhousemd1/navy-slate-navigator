
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { PunishmentData } from '../types';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for temporary ID

// Query key for punishments
const PUNISHMENTS_QUERY_KEY = 'punishments';

// Function to create a punishment in Supabase
const createPunishmentInSupabase = async (punishmentData: Omit<PunishmentData, 'id'> & { tempId?: string }): Promise<PunishmentData> => {
  try {
    // Ensure background_images is an array of strings or null
    let backgroundImages = punishmentData.background_images;
    if (backgroundImages && Array.isArray(backgroundImages)) {
      backgroundImages = backgroundImages.filter((img): img is string => typeof img === 'string' && !!img);
    }

    const dataToSave = {
      ...punishmentData,
      background_images: backgroundImages && backgroundImages.length > 0 ? backgroundImages : null,
      carousel_timer: punishmentData.carousel_timer ?? 5, // Default to 5 if undefined
    };
    // Remove tempId if it exists
    delete dataToSave.tempId;

    const { data, error } = await supabase
      .from('punishments')
      .insert(dataToSave)
      .select()
      .single();

    if (error) throw error;

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
    console.error('Error creating punishment in Supabase:', error);
    toast({
      title: "Database Error",
      description: "Failed to save the new punishment to the server.",
      variant: "destructive",
    });
    throw error;
  }
};

/**
 * Hook for creating new punishments with optimistic updates.
 */
export const useCreatePunishment = () => {
  const queryClient = useQueryClient();

  return useMutation<PunishmentData, Error, Omit<PunishmentData, 'id'>>({
    mutationFn: createPunishmentInSupabase,
    onMutate: async (newPunishmentData) => {
      // 1. Cancel ongoing fetches for the punishments query
      await queryClient.cancelQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });

      // 2. Snapshot the previous state
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>([PUNISHMENTS_QUERY_KEY]);

      // 3. Optimistically update the cache
      const optimisticPunishment: PunishmentData = {
        ...newPunishmentData,
        id: `temp-${uuidv4()}`, // Generate a temporary ID
        // Ensure defaults match Supabase function if needed
        background_images: newPunishmentData.background_images || [],
        carousel_timer: newPunishmentData.carousel_timer ?? 5,
        created_at: new Date().toISOString(), // Add temporary created_at
      };

      queryClient.setQueryData<PunishmentData[]>(
        [PUNISHMENTS_QUERY_KEY],
        (oldData = []) => [...oldData, optimisticPunishment]
      );

      // 4. Return context with snapshot and optimistic data
      return { previousPunishments, optimisticPunishment };
    },
    onError: (err, newPunishmentData, context) => {
      // 5. Rollback on error
      if (context?.previousPunishments) {
        queryClient.setQueryData([PUNISHMENTS_QUERY_KEY], context.previousPunishments);
      }
      console.error('Error creating punishment (onError):', err);
      toast({
        title: "Error",
        description: "Failed to create punishment. Reverting changes.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables, context) => {
        // 6. Update cache with the actual server data, replacing the temporary item
        queryClient.setQueryData<PunishmentData[]>(
            [PUNISHMENTS_QUERY_KEY],
            (oldData = []) => oldData.map(p =>
                p.id === context?.optimisticPunishment.id ? data : p
            )
        );
        toast({
            title: "Success",
            description: "Punishment created successfully.",
          });
    },
    onSettled: () => {
      // 7. Invalidate the query to ensure consistency
      //    Might be slightly delayed compared to onSuccess update, but ensures sync
      queryClient.invalidateQueries({ queryKey: [PUNISHMENTS_QUERY_KEY] });
    },
  });
};
