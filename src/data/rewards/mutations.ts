import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { BuyRewardParams, SaveRewardParams } from '@/contexts/rewards/rewardTypes';
import { saveRewardsToDB, savePointsToDB, saveDomPointsToDB } from "../indexedDB/useIndexedDB";

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (newReward: Omit<Reward, 'id'>) => {
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
    {
      onSuccess: async (data) => {
        // Invalidate and refetch to update the cache
        await queryClient.invalidateQueries({ queryKey: ['rewards'] });
        toast({
          title: "Success",
          description: "Reward created successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: `Failed to create reward: ${error.message}`,
          variant: "destructive",
        });
      },
    }
  );
};

export const useUpdateRewardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (updatedReward: { id: string } & Partial<Omit<Reward, 'id'>>) => {
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
    {
      onSuccess: async (data) => {
        // Invalidate and refetch to update the cache
        await queryClient.invalidateQueries({ queryKey: ['rewards'] });
        toast({
          title: "Success",
          description: "Reward updated successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: `Failed to update reward: ${error.message}`,
          variant: "destructive",
        });
      },
    }
  );
};

export const useDeleteRewardMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    async (id: string) => {
      const { data, error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting reward:", error);
        throw new Error(error.message);
      }
      return data;
    },
    {
      onSuccess: async () => {
        // Invalidate and refetch to update the cache
        await queryClient.invalidateQueries({ queryKey: ['rewards'] });
        toast({
          title: "Success",
          description: "Reward deleted successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: `Failed to delete reward: ${error.message}`,
          variant: "destructive",
        });
      },
    }
  );
};

export const useBuySubReward = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ rewardId, cost, currentSupply, profileId, currentPoints }: { rewardId: string; cost: number; currentSupply: number; profileId: string; currentPoints: number }) => {
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

      // Optimistically update the supply
      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      // Perform the database update
      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      const newPoints = currentPoints - cost;
      const { error: profileError } = await supabase.from('profiles').update({ points: newPoints }).eq('id', profileId);
      if (profileError) throw profileError;

      return { rewardId, newSupply, newPoints };
    },
    {
      onSuccess: async ({ newSupply, newPoints }) => {
        // After a successful mutation, invalidate the query
        await queryClient.invalidateQueries(['rewards']);
        await queryClient.invalidateQueries(['profile']);
        toast({
          title: "Reward Purchased",
          description: "Reward purchased successfully!",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: `Failed to purchase reward: ${error.message}`,
          variant: "destructive",
        });
      },
    }
  );
};

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ rewardId, cost, currentSupply, profileId, currentDomPoints }: { rewardId: string; cost: number; currentSupply: number; profileId: string; currentDomPoints: number }) => {
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

      // Optimistically update the supply
      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      // Perform the database update
      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      const newPoints = currentDomPoints - cost;
      const { error: profileError } = await supabase.from('profiles').update({ dom_points: newPoints }).eq('id', profileId);
      if (profileError) throw profileError;

      return { rewardId, newSupply, newPoints };
    },
    {
      onSuccess: async ({ newSupply, newPoints }) => {
        // After a successful mutation, invalidate the query
        await queryClient.invalidateQueries(['rewards']);
        await queryClient.invalidateQueries(['profile']);
        toast({
          title: "Reward Purchased",
          description: "Reward purchased successfully!",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: `Failed to purchase reward: ${error.message}`,
          variant: "destructive",
        });
      },
    }
  );
};

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ rewardId, currentSupply, profileId }: { rewardId: string; currentSupply: number; profileId: string }) => {
      if (currentSupply === 0) {
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Out of stock");
      }

      // Optimistically update the supply
      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      // Perform the database update
      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      return { rewardId, newSupply };
    },
    {
      onSuccess: async ({ newSupply }) => {
        // After a successful mutation, invalidate the query
        await queryClient.invalidateQueries(['rewards']);
        toast({
          title: "Reward Redeemed",
          description: "Reward redeemed successfully!",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: `Failed to redeem reward: ${error.message}`,
          variant: "destructive",
        });
      },
    }
  );
};

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async ({ rewardId, currentSupply, profileId }: { rewardId: string; currentSupply: number; profileId: string }) => {
      if (currentSupply === 0) {
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Out of stock");
      }

      // Optimistically update the supply
      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      // Perform the database update
      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      return { rewardId, newSupply };
    },
    {
      onSuccess: async ({ newSupply }) => {
        // After a successful mutation, invalidate the query
        await queryClient.invalidateQueries(['rewards']);
        toast({
          title: "Reward Redeemed",
          description: "Reward redeemed successfully!",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: `Failed to redeem reward: ${error.message}`,
          variant: "destructive",
        });
      },
    }
  );
};
