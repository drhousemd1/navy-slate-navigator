
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Define types for rewards data
export type RewardItem = {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  supply?: number;
  iconName?: string;
  icon_name?: string;
  icon_color?: string;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
};

// Define a type for reward usage data
type RewardUsage = {
  reward_id: string;
  day_of_week: number;
};

// Define context type
interface RewardsContextType {
  totalPoints: number;
  rewards: RewardItem[];
  rewardUsage: Record<string, boolean[]>;
  isLoading: boolean;
  handleBuy: (index: number) => void;
  handleUse: (index: number) => void;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<void>;
  handleDeleteReward: (index: number) => Promise<void>;
  getRewardUsage: (index: number) => boolean[];
  getFrequencyCount: (index: number) => number;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { toast } = useToast();
  const [totalPoints, setTotalPoints] = useState(0);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [rewardUsage, setRewardUsage] = useState<Record<string, boolean[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get the current session
  useEffect(() => {
    const getSession = async () => {
      try {
        console.log('Getting current session...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          return;
        }
        
        console.log('Session data:', data);
        if (data.session) {
          setUserId(data.session.user.id);
          console.log('User ID set:', data.session.user.id);
        } else {
          console.log('No active session found');
        }
      } catch (e) {
        console.error('Exception in getSession:', e);
      }
    };

    getSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user.id);
        setUserId(session?.user.id || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user points
  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!userId) {
        console.log('No user ID, skipping points fetch');
        return;
      }

      try {
        console.log('Fetching points for user:', userId);
        const { data, error } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user points:', error);
          return;
        }

        if (data) {
          console.log('User points data:', data);
          setTotalPoints(data.points);
        }
      } catch (error) {
        console.error('Exception in fetchUserPoints:', error);
      }
    };

    fetchUserPoints();
  }, [userId]);

  // Fetch rewards
  useEffect(() => {
    const fetchRewards = async () => {
      if (!userId) {
        console.log('No user ID, skipping rewards fetch');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Get all rewards
        console.log('Fetching rewards data...');
        const { data: rewardsData, error: rewardsError } = await supabase
          .from('rewards')
          .select('*');

        if (rewardsError) {
          console.error('Error fetching rewards:', rewardsError);
          throw rewardsError;
        }

        console.log('Raw rewards data:', rewardsData);
        
        // Check if there are any rewards at all
        if (!rewardsData || rewardsData.length === 0) {
          console.log('No rewards found in the database');
          setRewards([]);
          setIsLoading(false);
          return;
        }

        // Get user's reward supplies
        console.log('Fetching user reward supplies...');
        const { data: userRewardsData, error: userRewardsError } = await supabase
          .from('user_rewards')
          .select('reward_id, supply')
          .eq('user_id', userId);

        if (userRewardsError) {
          console.error('Error fetching user rewards:', userRewardsError);
          throw userRewardsError;
        }

        console.log('Raw user rewards data:', userRewardsData);

        // Create a mapping of reward_id to supply
        const supplyMap: Record<string, number> = {};
        userRewardsData?.forEach(item => {
          supplyMap[item.reward_id] = item.supply;
        });

        // Combine the data
        const combinedRewards = rewardsData?.map(reward => ({
          ...reward,
          iconName: reward.icon_name, // Map icon_name to iconName for backward compatibility
          supply: supplyMap[reward.id] || 0
        }));

        console.log('Combined rewards:', combinedRewards);

        setRewards(combinedRewards || []);
      } catch (error) {
        console.error('Error in rewards fetching process:', error);
        toast({
          title: "Error",
          description: "Failed to load rewards",
          variant: "destructive",
        });
        // Set rewards to empty array so we exit loading state
        setRewards([]);
      } finally {
        console.log('Finished fetchRewards, setting isLoading to false');
        setIsLoading(false);
      }
    };

    fetchRewards();
  }, [userId, toast]);

  // Fetch reward usage
  useEffect(() => {
    const fetchRewardUsage = async () => {
      if (!userId || rewards.length === 0) {
        console.log('No user ID or no rewards, skipping usage fetch');
        return;
      }
      
      try {
        console.log('Fetching reward usage for user:', userId);
        // Use the RPC function to get reward usage data with type assertion
        const response = await (supabase.rpc as any)('get_reward_usage', { 
          user_id_param: userId 
        });

        if (response.error) {
          console.error('RPC get_reward_usage error:', response.error);
          throw response.error;
        }

        // Type assertion to help TypeScript understand the structure
        const data = response.data as RewardUsage[] | null;
        console.log('Raw reward usage data:', data);
        
        const usageData: Record<string, boolean[]> = {};
        
        // Initialize all rewards with false for all days
        rewards.forEach((reward, index) => {
          usageData[`reward-${index}`] = Array(7).fill(false);
        });
        
        // Update with actual usage data if we have it
        if (data && Array.isArray(data)) {
          data.forEach((usage) => {
            const rewardIndex = rewards.findIndex(r => r.id === usage.reward_id);
            if (rewardIndex !== -1) {
              usageData[`reward-${rewardIndex}`][usage.day_of_week] = true;
            }
          });
        }

        console.log('Processed reward usage data:', usageData);
        setRewardUsage(usageData);
      } catch (error) {
        console.error('Error fetching reward usage:', error);
        // Continue without usage data rather than blocking the UI
      }
    };

    fetchRewardUsage();
  }, [rewards, userId]);

  // Get the current day of week (0-6, Sunday-Saturday)
  const getCurrentDayOfWeek = () => {
    return new Date().getDay();
  };

  // Handle buying a reward
  const handleBuy = async (index: number) => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to buy rewards",
        variant: "destructive",
      });
      return;
    }
    
    const reward = rewards[index];
    
    // Check if user has enough points
    if (totalPoints >= reward.cost) {
      try {
        // Begin by updating the user's points
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: totalPoints - reward.cost })
          .eq('id', userId);

        if (pointsError) {
          throw pointsError;
        }

        // Then update the user's reward supply
        const { error: supplyError } = await supabase
          .from('user_rewards')
          .upsert({
            user_id: userId,
            reward_id: reward.id,
            supply: (reward.supply || 0) + 1
          }, {
            onConflict: 'user_id,reward_id'
          });

        if (supplyError) {
          throw supplyError;
        }

        // Update local state
        setTotalPoints(totalPoints - reward.cost);
        
        const updatedRewards = [...rewards];
        updatedRewards[index] = {
          ...reward,
          supply: (reward.supply || 0) + 1
        };
        setRewards(updatedRewards);

        toast({
          title: "Reward Purchased",
          description: `You purchased ${reward.title}`,
        });
      } catch (error) {
        console.error('Error buying reward:', error);
        toast({
          title: "Purchase Failed",
          description: "There was an error processing your purchase",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.cost - totalPoints} more points`,
        variant: "destructive",
      });
    }
  };

  // Handle using a reward
  const handleUse = async (index: number) => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use rewards",
        variant: "destructive",
      });
      return;
    }
    
    const reward = rewards[index];
    
    // Check if the reward has any supply left
    if (reward.supply && reward.supply > 0) {
      try {
        // Update the user's reward supply
        const { error: supplyError } = await supabase
          .from('user_rewards')
          .update({ supply: reward.supply - 1 })
          .eq('user_id', userId)
          .eq('reward_id', reward.id);

        if (supplyError) {
          throw supplyError;
        }

        // Track usage for this day of the week
        const currentDay = getCurrentDayOfWeek();
        
        // Use RPC function with proper error handling and type assertion
        const response = await (supabase.rpc as any)('upsert_reward_usage', {
          user_id_param: userId,
          reward_id_param: reward.id,
          day_of_week_param: currentDay
        });

        if (response.error) {
          console.error('RPC upsert_reward_usage error:', response.error);
          throw response.error;
        }

        // Update local state
        const updatedRewards = [...rewards];
        updatedRewards[index] = {
          ...reward,
          supply: reward.supply - 1
        };
        setRewards(updatedRewards);
        
        // Update usage tracking
        const rewardId = `reward-${index}`;
        const updatedUsage = { ...rewardUsage };
        
        if (!updatedUsage[rewardId]) {
          updatedUsage[rewardId] = Array(7).fill(false);
        }
        
        updatedUsage[rewardId][currentDay] = true;
        setRewardUsage(updatedUsage);

        toast({
          title: "Reward Used",
          description: `You used ${reward.title}`,
        });
      } catch (error) {
        console.error('Error using reward:', error);
        toast({
          title: "Error",
          description: "Failed to use the reward",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No Supply",
        description: "You don't have any of this reward to use",
        variant: "destructive",
      });
    }
  };

  // Get usage data for a specific reward
  const getRewardUsage = (index: number) => {
    const rewardId = `reward-${index}`;
    return rewardUsage[rewardId] || Array(7).fill(false);
  };
  
  // Calculate frequency count (number of days used this week)
  const getFrequencyCount = (index: number) => {
    const usage = getRewardUsage(index);
    return usage.filter(Boolean).length;
  };

  // Handle saving edited reward
  const handleSaveReward = async (rewardData: any, index: number | null) => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save rewards",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Saving reward with data:', rewardData);
      console.log('Current index:', index);
      
      // Prepare the data for Supabase
      const supabaseData = {
        title: rewardData.title,
        description: rewardData.description,
        cost: rewardData.cost,
        icon_name: rewardData.iconName || rewardData.icon_name,
        icon_color: rewardData.icon_color,
        background_image_url: rewardData.background_image_url,
        background_opacity: rewardData.background_opacity,
        focal_point_x: rewardData.focal_point_x,
        focal_point_y: rewardData.focal_point_y,
        highlight_effect: rewardData.highlight_effect,
        title_color: rewardData.title_color,
        subtext_color: rewardData.subtext_color,
        calendar_color: rewardData.calendar_color,
        updated_at: new Date().toISOString()
      };

      console.log('Prepared Supabase data:', supabaseData);
      
      let result;
      
      if (index !== null && rewards[index]?.id) {
        // Update existing reward
        console.log(`Updating existing reward with ID: ${rewards[index].id}`);
        const { data, error } = await supabase
          .from('rewards')
          .update(supabaseData)
          .eq('id', rewards[index].id)
          .select();

        if (error) {
          console.error('Error updating reward:', error);
          throw error;
        }
        console.log('Update result:', data);
        result = data?.[0];
      } else {
        // Insert new reward
        console.log('Inserting new reward');
        const { data, error } = await supabase
          .from('rewards')
          .insert(supabaseData)
          .select();

        if (error) {
          console.error('Error inserting reward:', error);
          throw error;
        }
        console.log('Insert result:', data);
        result = data?.[0];
      }

      if (result) {
        console.log('Save operation successful, result:', result);
        // Update local state
        if (index !== null) {
          console.log(`Updating reward at index ${index}`);
          const updatedRewards = [...rewards];
          updatedRewards[index] = {
            ...result,
            iconName: result.icon_name,
            supply: rewards[index]?.supply || 0
          };
          setRewards(updatedRewards);
        } else {
          console.log('Adding new reward to state');
          setRewards(prevRewards => [
            ...prevRewards,
            {
              ...result,
              iconName: result.icon_name,
              supply: 0
            }
          ]);
        }

        toast({
          title: "Success",
          description: "Reward saved successfully",
        });
      } else {
        console.error('No result returned from Supabase operation');
        toast({
          title: "Warning",
          description: "Reward may not have been saved properly",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      toast({
        title: "Error",
        description: "Failed to save reward",
        variant: "destructive",
      });
    }
  };

  // Handle deleting a reward
  const handleDeleteReward = async (index: number) => {
    if (!userId || !rewards[index]?.id) {
      return;
    }

    try {
      const rewardId = rewards[index].id;
      
      // Delete the reward
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

      if (error) throw error;

      // Also clean up user_rewards entries
      await supabase
        .from('user_rewards')
        .delete()
        .eq('reward_id', rewardId);

      // Delete reward usage through RPC with type assertion
      const response = await (supabase.rpc as any)('delete_reward_usage', {
        reward_id_param: rewardId
      });
      
      if (response.error) {
        console.error('RPC delete_reward_usage error:', response.error);
        // Continue even if there's an error with usage deletion
      }

      // Update local state
      setRewards(prevRewards => prevRewards.filter((_, i) => i !== index));
      
      // Clean up the usage data
      const updatedUsage = { ...rewardUsage };
      delete updatedUsage[`reward-${index}`];
      
      // Reindex the remaining rewards' usage data
      Object.keys(updatedUsage).forEach(key => {
        const keyIndex = parseInt(key.split('-')[1]);
        if (keyIndex > index) {
          updatedUsage[`reward-${keyIndex - 1}`] = updatedUsage[key];
          delete updatedUsage[key];
        }
      });
      
      setRewardUsage(updatedUsage);

      toast({
        title: "Reward Deleted",
        description: "The reward has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast({
        title: "Error",
        description: "Failed to delete reward",
        variant: "destructive",
      });
    }
  };

  return (
    <RewardsContext.Provider
      value={{
        totalPoints,
        rewards,
        rewardUsage,
        isLoading,
        handleBuy,
        handleUse,
        handleSaveReward,
        handleDeleteReward,
        getRewardUsage,
        getFrequencyCount
      }}
    >
      {children}
    </RewardsContext.Provider>
  );
};

export const useRewards = (): RewardsContextType => {
  const context = useContext(RewardsContext);
  if (context === undefined) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }
  return context;
};
