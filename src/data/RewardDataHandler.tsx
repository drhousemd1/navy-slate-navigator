// src/data/RewardDataHandler.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Reward {
  id?: number;
  title: string;
  description: string | null;
  cost: number;
  background_image_url?: string | null;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  icon_color: string;
}

// Function to fetch rewards from Supabase
const fetchRewards = async () => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Reward[];
};

// useQuery hook to fetch rewards
export const useRewards = () => {
  return useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 20,       // Consider data fresh for 20 minutes
    cacheTime: 1000 * 60 * 30,       // Keep data in memory for 30 minutes after inactive
    refetchOnWindowFocus: false      // Avoid refetch when switching back to tab
  });
};

// Function to update a reward in Supabase
const updateReward = async (reward: Partial<Reward>) => {
  const { data, error } = await supabase
    .from('rewards')
    .update(reward)
    .eq('id', reward.id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to update a reward
export const useUpdateReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateReward,
    onMutate: async (updatedReward) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rewards'] });

      // Snapshot the previous value
      const previousRewards = queryClient.getQueryData<Reward[]>(['rewards']);

      // Optimistically update to the new value
      queryClient.setQueryData<Reward[]>(['rewards'], (old) =>
        old?.map((reward) =>
          reward.id === updatedReward.id ? { ...reward, ...updatedReward } : reward
        ) ?? []
      );

      // Return a context object with the snapshotted value
      return { previousRewards };
    },
    onError: (err, updatedReward, context: any) => {
      queryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
};

// Function to create a reward in Supabase
const createReward = async (reward: Partial<Reward>) => {
  const { data, error } = await supabase
    .from('rewards')
    .insert(reward)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to create a reward
export const useCreateReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReward,
    onMutate: async (newReward) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rewards'] });

      // Snapshot the previous value
      const previousRewards = queryClient.getQueryData<Reward[]>(['rewards']);

      // Optimistically update to the new value
      queryClient.setQueryData<Reward[]>(['rewards'], (old) => [...(old ?? []), { ...newReward, id: 'temp_id' }]); // Assign a temporary ID

      // Return a context object with the snapshotted value
      return { previousRewards };
    },
    onError: (err, newReward, context: any) => {
      queryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
};

// Function to delete a reward in Supabase
const deleteReward = async (rewardId: number) => {
  const { data, error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// useMutation hook to delete a reward
export const useDeleteReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReward,
    onMutate: async (rewardId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rewards'] });

      // Snapshot the previous value
      const previousRewards = queryClient.getQueryData<Reward[]>(['rewards']);

      // Optimistically update to the new value
      queryClient.setQueryData<Reward[]>(['rewards'], (old) =>
        old?.filter((reward) => reward.id !== rewardId) ?? []
      );

      // Return a context object with the snapshotted value
      return { previousRewards };
    },
    onError: (err, rewardId, context: any) => {
      queryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
};
