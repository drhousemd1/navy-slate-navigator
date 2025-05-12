/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { saveRewardsToDB } from '@/data/indexedDB/useIndexedDB';
import { syncCardById } from '@/data/sync/useSyncManager';
import { REWARDS_POINTS_QUERY_KEY, REWARDS_DOM_POINTS_QUERY_KEY } from '@/data/rewards/queries';

interface BuyRewardParams {
  reward: Reward;
}

export function useBuyReward() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reward }: BuyRewardParams): Promise<Reward> => {
      try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          throw new Error('User not authenticated');
        }
        
        // First, get current points from profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('points, dom_points')
          .eq('id', userData.user.id)
          .single();
          
        if (profileError) {
          throw profileError;
        }
        
        const points = profile.points;
        const domPoints = profile.dom_points;
        const isDomReward = reward.is_dom_reward || false;
        const cost = reward.cost || 0;
        
        // Check if user has enough points
        if (isDomReward) {
          if (domPoints < cost) {
            throw new Error('Not enough dom points to buy this reward');
          }
        } else {
          if (points < cost) {
            throw new Error('Not enough points to buy this reward');
          }
        }
        
        // Get the current date for tracking
        const now = new Date();
        const currentDate = format(now, 'yyyy-MM-dd');
        const dayOfWeek = now.getDay();
        const weekNumber = `${format(now, 'yyyy')}-W${format(now, 'ww')}`;
        
        // Reduce the reward supply by 1
        const { data: updatedReward, error: rewardError } = await supabase
          .from('rewards')
          .update({ 
            supply: Math.max(0, (reward.supply || 1) - 1),
            updated_at: now.toISOString()
          })
          .eq('id', reward.id)
          .select()
          .single();
          
        if (rewardError) {
          throw rewardError;
        }
        
        // Record the reward usage
        const { error: usageError } = await supabase
          .from('reward_usage')
          .insert({
            reward_id: reward.id,
            created_at: now.toISOString(),
            week_number: weekNumber,
            day_of_week: dayOfWeek
          });
          
        if (usageError) {
          console.error('Error recording reward usage:', usageError);
          // Continue despite error in recording usage
        }
        
        // Update user's points
        const { error: pointsError } = await supabase
          .from('profiles')
          .update(isDomReward 
            ? { dom_points: domPoints - cost }
            : { points: points - cost }
          )
          .eq('id', userData.user.id);
          
        if (pointsError) {
          throw pointsError;
        }
        
        return updatedReward as Reward;
      } catch (err) {
        console.error('Error buying reward:', err);
        throw err;
      }
    },
    onSuccess: (updatedReward) => {
      // Update rewards cache
      queryClient.setQueryData(['rewards'], (oldRewards: Reward[] = []) => {
        const updatedRewards = oldRewards.map(reward => 
          reward.id === updatedReward.id ? updatedReward : reward
        );
        
        // Update IndexedDB
        saveRewardsToDB(updatedRewards);
        
        return updatedRewards;
      });
      
      // Sync the individual card
      syncCardById(updatedReward.id);
      
      // Invalidate points queries
      queryClient.invalidateQueries({ queryKey: REWARDS_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REWARDS_DOM_POINTS_QUERY_KEY });
      
      // Invalidate metrics queries since reward usage affects them
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      
      toast({
        title: 'Success',
        description: 'Reward purchased successfully'
      });
    },
    onError: (error: Error) => {
      console.error('Error in useBuyReward:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to purchase reward',
        variant: 'destructive'
      });
    }
  });
}
