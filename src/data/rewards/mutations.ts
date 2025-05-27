import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { BuyRewardParams, SaveRewardParams } from '@/contexts/rewards/rewardTypes'; // Ensure these types are correctly defined and exported
import { logger } from '@/lib/logger'; // Added logger import

// Define types for mutation variables and responses if not already clearly defined
type CreateRewardVars = Omit<Reward, 'id' | 'created_at' | 'updated_at'>; // Ensure 'id' is omitted for creation
type UpdateRewardVars = { id: string } & Partial<Omit<Reward, 'id'>>; // 'id' is required for updates

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<Reward, Error, CreateRewardVars>({ // Added explicit type parameters
    mutationFn: async (newReward) => {
      const { data, error } = await supabase
        .from('rewards')
        .insert([newReward])
        .select()
        .single();

      if (error) {
        logger.error("Error creating reward:", error); // Replaced console.error
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
    onError: (error: Error) => { // Explicitly type error
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
  return useMutation<Reward, Error, UpdateRewardVars>({ // Added explicit type parameters
    mutationFn: async (updatedReward) => {
      const { id, ...updates } = updatedReward;
      const { data, error } = await supabase
        .from('rewards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating reward:", error); // Replaced console.error
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
    onError: (error: Error) => { // Explicitly type error
      toast({
        title: "Error",
        description: `Failed to update reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteRewardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, string>({ // Changed response type to unknown or a more specific type if applicable
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error("Error deleting reward:", error); // Replaced console.error
        throw new Error(error.message);
      }
      return data; // data is null on successful delete with no .select()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Success",
        description: "Reward deleted successfully",
      });
    },
    onError: (error: Error) => { // Explicitly type error
      toast({
        title: "Error",
        description: `Failed to delete reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

interface BuySubRewardVars { rewardId: string; cost: number; currentSupply: number; profileId: string; currentPoints: number }
interface BuySubRewardResponse { rewardId: string; newSupply: number; newPoints: number }

export const useBuySubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<BuySubRewardResponse, Error, BuySubRewardVars>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentPoints }) => {
      if (currentPoints < cost) {
        toast({
          title: "Not enough points",
          description: "You do not have enough points to purchase this reward.",
          variant: "destructive",
        });
        throw new Error("Not enough points");
      }

      if (currentSupply === 0) {
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Out of stock");
      }

      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      const newPoints = currentPoints - cost;
      const { error: profileError } = await supabase.from('profiles').update({ points: newPoints }).eq('id', profileId);
      if (profileError) throw profileError;

      return { rewardId, newSupply, newPoints };
    },
    onSuccess: async ({ newSupply, newPoints }) => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] }); // Ensure 'profile' is a valid query key used elsewhere
      toast({
        title: "Reward Purchased",
        description: "Reward purchased successfully!",
      });
    },
    onError: (error: Error) => { // Explicitly type error
      toast({
        title: "Error",
        description: `Failed to purchase reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

interface BuyDomRewardVars { rewardId: string; cost: number; currentSupply: number; profileId: string; currentDomPoints: number }
interface BuyDomRewardResponse { rewardId: string; newSupply: number; newPoints: number }

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<BuyDomRewardResponse, Error, BuyDomRewardVars>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentDomPoints }) => {
      if (currentDomPoints < cost) {
        toast({
          title: "Not enough points",
          description: "You do not have enough points to purchase this reward.",
          variant: "destructive",
        });
        throw new Error("Not enough points");
      }

      if (currentSupply === 0) {
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Out of stock");
      }

      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      const newPoints = currentDomPoints - cost;
      const { error: profileError } = await supabase.from('profiles').update({ dom_points: newPoints }).eq('id', profileId);
      if (profileError) throw profileError;

      return { rewardId, newSupply, newPoints };
    },
    onSuccess: async ({ newSupply, newPoints }) => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] }); // Ensure 'profile' is a valid query key used elsewhere
      toast({
        title: "Reward Purchased",
        description: "Reward purchased successfully!",
      });
    },
    onError: (error: Error) => { // Explicitly type error
      toast({
        title: "Error",
        description: `Failed to purchase reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

interface RedeemRewardVars { rewardId: string; currentSupply: number; profileId: string }
interface RedeemRewardResponse { rewardId: string; newSupply: number }

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<RedeemRewardResponse, Error, RedeemRewardVars>({
    mutationFn: async ({ rewardId, currentSupply, profileId }) => {
      if (currentSupply === 0) {
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Out of stock");
      }

      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      return { rewardId, newSupply };
    },
    onSuccess: async ({ newSupply }) => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Reward Redeemed",
        description: "Reward redeemed successfully!",
      });
    },
    onError: (error: Error) => { // Explicitly type error
      toast({
        title: "Error",
        description: `Failed to redeem reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<RedeemRewardResponse, Error, RedeemRewardVars>({
    mutationFn: async ({ rewardId, currentSupply, profileId }) => {
      if (currentSupply === 0) {
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Out of stock");
      }

      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      return { rewardId, newSupply };
    },
    onSuccess: async ({ newSupply }) => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Reward Redeemed",
        description: "Reward redeemed successfully!",
      });
    },
    onError: (error: Error) => { // Explicitly type error
      toast({
        title: "Error",
        description: `Failed to redeem reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
