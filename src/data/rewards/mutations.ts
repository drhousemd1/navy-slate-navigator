import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";
import { Reward } from '@/lib/rewardUtils';
import { REWARDS_QUERY_KEY, REWARDS_POINTS_QUERY_KEY, REWARDS_SUPPLY_QUERY_KEY } from './queries';

export const saveRewardMutation = (queryClient: QueryClient, showToast: boolean = true) => ({
  mutationFn: async (params: { rewardData: Partial<Reward>; currentIndex?: number | null }): Promise<Reward> => {
    const { rewardData, currentIndex } = params;
    
    if (rewardData.id) {
      // Update existing reward
      const { data, error } = await supabase
        .from('rewards')
        .update({
          title: rewardData.title,
          description: rewardData.description,
          cost: rewardData.cost,
          background_image_url: rewardData.background_image_url,
          background_opacity: rewardData.background_opacity,
          icon_name: rewardData.icon_name,
          icon_color: rewardData.icon_color,
          title_color: rewardData.title_color,
          subtext_color: rewardData.subtext_color,
          calendar_color: rewardData.calendar_color,
          highlight_effect: rewardData.highlight_effect,
          focal_point_x: rewardData.focal_point_x,
          focal_point_y: rewardData.focal_point_y,
        })
        .eq('id', rewardData.id)
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      return data;
    } else {
      // Create new reward
      const { data, error } = await supabase
        .from('rewards')
        .insert({
          title: rewardData.title || 'New Reward',
          description: rewardData.description || '',
          cost: rewardData.cost || 10,
          supply: rewardData.supply || 0,
          background_image_url: rewardData.background_image_url,
          background_opacity: rewardData.background_opacity || 100,
          icon_name: rewardData.icon_name,
          icon_color: rewardData.icon_color || '#9b87f5',
          title_color: rewardData.title_color || '#FFFFFF',
          subtext_color: rewardData.subtext_color || '#8E9196',
          calendar_color: rewardData.calendar_color || '#7E69AB',
          highlight_effect: rewardData.highlight_effect || false,
          focal_point_x: rewardData.focal_point_x || 50,
          focal_point_y: rewardData.focal_point_y || 50,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    }
  },
  onMutate: async ({ rewardData, currentIndex }) => {
    // Define the type of promises array explicitly
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
    
    if (rewardData.id) {
      // Updating existing reward
      queryClient.setQueryData<Reward[]>(
        REWARDS_QUERY_KEY, 
        previousRewards.map(r => 
          r.id === rewardData.id 
            ? { ...r, ...rewardData, updated_at: new Date().toISOString() } 
            : r
        )
      );
    } else {
      // Creating new reward - add to beginning of list for immediate visibility
      const tempId = `temp-${Date.now()}`;
      const optimisticReward: Reward = {
        id: tempId,
        title: rewardData.title || 'New Reward',
        description: rewardData.description || '',
        cost: rewardData.cost || 10,
        supply: rewardData.supply || 0,
        background_image_url: rewardData.background_image_url,
        background_opacity: rewardData.background_opacity || 100,
        icon_name: rewardData.icon_name,
        icon_color: rewardData.icon_color || '#9b87f5',
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#8E9196',
        calendar_color: rewardData.calendar_color || '#7E69AB',
        highlight_effect: rewardData.highlight_effect || false,
        focal_point_x: rewardData.focal_point_x || 50,
        focal_point_y: rewardData.focal_point_y || 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Place new rewards at the beginning of the list
      queryClient.setQueryData<Reward[]>(
        REWARDS_QUERY_KEY, 
        [optimisticReward, ...previousRewards]
      );
    }
    
    return { previousRewards };
  },
  onError: (err, _, context) => {
    if (showToast) {
      toast({
        title: "Error",
        description: "Failed to save reward",
        variant: "destructive",
      });
    }
    
    if (context) {
      queryClient.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
    }
  },
  onSuccess: () => {
    if (showToast) {
      toast({
        title: "Success",
        description: "Reward saved successfully",
      });
    }
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
  }
});

export const deleteRewardMutation = (queryClient: QueryClient, showToast: boolean = true) => ({
  mutationFn: async (rewardId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', rewardId);

    if (error) throw error;
    return true;
  },
  onMutate: async (rewardId: string) => {
    // Define the type of promises array explicitly
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
    
    queryClient.setQueryData<Reward[]>(
      REWARDS_QUERY_KEY, 
      previousRewards.filter(r => r.id !== rewardId)
    );
    
    return { previousRewards };
  },
  onError: (err, _, context) => {
    if (showToast) {
      toast({
        title: "Error",
        description: "Failed to delete reward",
        variant: "destructive",
      });
    }
    
    if (context) {
      queryClient.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
    }
  },
  onSuccess: () => {
    if (showToast) {
      toast({
        title: "Success",
        description: "Reward deleted successfully",
      });
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
  }
});

export const buyRewardMutation = (queryClient: QueryClient) => ({
  mutationFn: async ({ rewardId, cost }: { rewardId: string, cost: number }): Promise<{ success: boolean, newPoints: number }> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      throw new Error('User is not logged in');
    }
    
    // First, check user points
    const { data: userPoints, error: pointsError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();
    
    if (pointsError) throw pointsError;
    
    if (!userPoints || userPoints.points < cost) {
      throw new Error('Not enough points to buy this reward');
    }
    
    // Then, check if reward is available
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('supply')
      .eq('id', rewardId)
      .single();
    
    if (rewardError) throw rewardError;
    
    // Start transaction-like operations
    // First, deduct points
    const newPoints = userPoints.points - cost;
    const { error: updatePointsError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId);
    
    if (updatePointsError) throw updatePointsError;
    
    // Then, increment reward supply
    const { error: updateSupplyError } = await supabase
      .from('rewards')
      .update({ 
        supply: reward.supply + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', rewardId);
    
    if (updateSupplyError) {
      // Try to revert the points update on error
      await supabase
        .from('profiles')
        .update({ points: userPoints.points })
        .eq('id', userId);
      throw updateSupplyError;
    }
    
    // Record usage
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
    
    await supabase
      .from('reward_usage')
      .insert({
        reward_id: rewardId,
        day_of_week: dayOfWeek,
        used: false, // It's not used yet, just bought
        week_number: weekNumber
      });
    
    return { success: true, newPoints };
  },
  onMutate: async ({ rewardId, cost }) => {
    // Define the type of promises array explicitly
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY }),
      queryClient.cancelQueries({ queryKey: REWARDS_POINTS_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    
    const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
    const previousPoints = queryClient.getQueryData<number>(REWARDS_POINTS_QUERY_KEY) || 0;
    
    // Optimistically update the reward supply
    queryClient.setQueryData<Reward[]>(
      REWARDS_QUERY_KEY, 
      previousRewards.map(r => {
        if (r.id === rewardId) {
          return { ...r, supply: r.supply + 1 };
        }
        return r;
      })
    );
    
    // Optimistically update the points
    queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, previousPoints - cost);
    
    return { 
      previousRewards, 
      previousPoints
    };
  },
  onError: (err, _, context) => {
    if (showToast) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to buy reward',
        variant: "destructive",
      });
    }
    
    if (context) {
      queryClient.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
      queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, context.previousPoints);
    }
  },
  onSuccess: () => {
    if (showToast) {
      toast({
        title: "Success",
        description: "Reward purchased successfully",
      });
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
  }
});

export const useRewardMutation = (queryClient: QueryClient) => ({
  mutationFn: async (rewardId: string): Promise<boolean> => {
    // Get the reward first to check supply
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('supply')
      .eq('id', rewardId)
      .single();
    
    if (rewardError) throw rewardError;
    
    if (reward.supply <= 0) {
      throw new Error('No rewards available to use');
    }
    
    // Update reward supply
    const { error } = await supabase
      .from('rewards')
      .update({ 
        supply: reward.supply - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', rewardId);
    
    if (error) throw error;
    
    // Record usage
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
    
    await supabase
      .from('reward_usage')
      .insert({
        reward_id: rewardId,
        day_of_week: dayOfWeek,
        used: true,
        week_number: weekNumber
      });
    
    return true;
  },
  onMutate: async (rewardId: string) => {
    // Define the type of promises array explicitly
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY) || [];
    
    // Optimistically update the reward supply
    queryClient.setQueryData<Reward[]>(
      REWARDS_QUERY_KEY, 
      previousRewards.map(r => {
        if (r.id === rewardId) {
          return { ...r, supply: Math.max(0, r.supply - 1) };
        }
        return r;
      })
    );
    
    return { previousRewards };
  },
  onError: (err, _, context) => {
    if (showToast) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to use reward',
        variant: "destructive",
      });
    }
    
    if (context) {
      queryClient.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
    }
  },
  onSuccess: () => {
    if (showToast) {
      toast({
        title: "Success",
        description: "Reward used successfully",
      });
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: REWARDS_SUPPLY_QUERY_KEY });
  }
});

export const updateUserPointsMutation = (queryClient: QueryClient) => ({
  mutationFn: async (points: number): Promise<boolean> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      throw new Error('User is not logged in');
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({ points })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  },
  onMutate: async (points: number) => {
    // Define the type of promises array explicitly
    const promises: Promise<void>[] = [
      queryClient.cancelQueries({ queryKey: REWARDS_POINTS_QUERY_KEY })
    ];
    
    await Promise.all(promises);
    const previousPoints = queryClient.getQueryData<number>(REWARDS_POINTS_QUERY_KEY) || 0;
    
    // Optimistically update points
    queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, points);
    
    return { previousPoints };
  },
  onError: (err, _, context) => {
    if (showToast) {
      toast({
        title: "Error",
        description: "Failed to update points",
        variant: "destructive",
      });
    }
    
    if (context) {
      queryClient.setQueryData(REWARDS_POINTS_QUERY_KEY, context.previousPoints);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
  }
});
