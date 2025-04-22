// src/data/PunishmentDataHandler.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PunishmentData {
  id?: string;
  title: string;
  description?: string;
  points: number;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
}

// Function to fetch punishments from Supabase
const fetchPunishments = async () => {
  const { data, error } = await supabase
    .from('punishments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as PunishmentData[];
};

// useQuery hook to fetch punishments
export const usePunishments = () => {
  return useQuery({
    queryKey: ['punishments'],
    queryFn: fetchPunishments,
    staleTime: 1000 * 60 * 20,       // Consider data fresh for 20 minutes
    cacheTime: 1000 * 60 * 30,       // Keep data in memory for 30 minutes after inactive
    refetchOnWindowFocus: false      // Avoid refetch when switching back to tab
  });
};

// Function to update a punishment in Supabase
const updatePunishment = async (punishment: Partial<PunishmentData>) => {
  const { data, error } = await supabase
    .from('punishments')
    .update(punishment)
    .eq('id', punishment.id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to update a punishment
export const useUpdatePunishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePunishment,
    onMutate: async (updatedPunishment) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['punishments'] });

      // Snapshot the previous value
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(['punishments']);

      // Optimistically update to the new value
      queryClient.setQueryData<PunishmentData[]>(['punishments'], (old) =>
        old?.map((punishment) =>
          punishment.id === updatedPunishment.id ? { ...punishment, ...updatedPunishment } : punishment
        ) ?? []
      );

      // Return a context object with the snapshotted value
      return { previousPunishments };
    },
    onError: (err, updatedPunishment, context: any) => {
      queryClient.setQueryData<PunishmentData[]>(['punishments'], context.previousPunishments);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['punishments'] });
    },
  });
};

// Function to create a punishment in Supabase
const createPunishment = async (punishment: Partial<PunishmentData>) => {
  const { data, error } = await supabase
    .from('punishments')
    .insert(punishment)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to create a punishment
export const useCreatePunishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPunishment,
    onMutate: async (newPunishment) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['punishments'] });

      // Snapshot the previous value
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(['punishments']);

      // Optimistically update to the new value
      queryClient.setQueryData<PunishmentData[]>(['punishments'], (old) => [...(old ?? []), { ...newPunishment, id: 'temp_id' }]); // Assign a temporary ID

      // Return a context object with the snapshotted value
      return { previousPunishments };
    },
    onError: (err, newPunishment, context: any) => {
      queryClient.setQueryData<PunishmentData[]>(['punishments'], context.previousPunishments);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['punishments'] });
    },
  });
};

// Function to delete a punishment in Supabase
const deletePunishment = async (punishmentId: string) => {
  const { data, error } = await supabase
    .from('punishments')
    .delete()
    .eq('id', punishmentId)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to delete a punishment
export const useDeletePunishment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePunishment,
    onMutate: async (punishmentId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['punishments'] });

      // Snapshot the previous value
      const previousPunishments = queryClient.getQueryData<PunishmentData[]>(['punishments']);

      // Optimistically update to the new value
      queryClient.setQueryData<PunishmentData[]>(['punishments'], (old) =>
        old?.filter((punishment) => punishment.id !== punishmentId) ?? []
      );

      // Return a context object with the snapshotted value
      return { previousPunishments };
    },
    onError: (err, punishmentId, context: any) => {
      queryClient.setQueryData<PunishmentData[]>(['punishments'], context.previousPunishments);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['punishments'] });
    },
  });
};
