

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { Reward, CreateRewardVariables as TypesCreateRewardVariables } from '@/data/rewards/types';

// Define types for mutation variables - importing from the central types file
export type CreateRewardVariables = TypesCreateRewardVariables;

export type UpdateRewardVariables = { id: string } & Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>>;

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newReward: CreateRewardVariables) => {
      const { data, error } = await supabase
        .from('rewards')
        .insert([newReward])
        .select()
        .single();

      if (error) {
        console.error("Error creating reward:", error);
        throw new Error(error.message);
      }
      return data as Reward;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Success",
        description: "Reward created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateRewardMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updatedReward: UpdateRewardVariables) => {
      const { id, ...updates } = updatedReward;
      const { data, error } = await supabase
        .from('rewards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating reward:", error);
        throw new Error(error.message);
      }
      return data as Reward;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Success",
        description: "Reward updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

