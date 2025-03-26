
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Define initial rewards data for fallback (will only be used when offline or on error)
const initialRewards = [
  {
    title: "Movie Night",
    description: "Watch any movie of your choice",
    cost: 20,
    supply: 0,
    iconName: "Film",
  },
  {
    title: "Gaming Session",
    description: "1 hour of uninterrupted gaming time",
    cost: 15,
    supply: 0,
    iconName: "Gamepad2",
  },
  {
    title: "Dessert Treat",
    description: "Get your favorite dessert",
    cost: 25,
    supply: 0,
    iconName: "Cake",
  },
  {
    title: "Sleep In",
    description: "Sleep an extra hour in the morning",
    cost: 30,
    supply: 0,
    iconName: "Moon",
  }
];

// Tracking key for usage
const REWARD_USAGE_STORAGE_KEY = 'rewardUsage';

type RewardItem = {
  id?: string;
  title: string;
  description: string;
  cost: number;
  supply: number;
  iconName?: string;
  icon_name?: string; // Adding this to match Supabase column name
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

type UserReward = {
  id: string;
  reward_id: string;
  user_id: string;
  supply: number;
};

// Define the shape of data that comes directly from Supabase
type SupabaseReward = {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  icon_name: string | null;
  icon_color: string | null;
  created_at: string;
  updated_at: string;
  background_image_url?: string | null;
  background_opacity?: number;
  focal_point_x?: number | null;
  focal_point_y?: number | null;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
};

interface RewardsContextType {
  totalPoints: number;
  rewards: RewardItem[];
  rewardUsage: Record<string, boolean[]>;
  handleBuy: (rewardId: string) => void;
  handleUse: (rewardId: string) => void;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<void>;
  handleDeleteReward: (rewardId: string) => void;
  getRewardUsage: (rewardId: string) => boolean[];
  getFrequencyCount: (rewardId: string) => number;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize the usage tracking state from localStorage
  const [rewardUsage, setRewardUsage] = useState<Record<string, boolean[]>>(() => {
    try {
      const savedUsage = localStorage.getItem(REWARD_USAGE_STORAGE_KEY);
      return savedUsage ? JSON.parse(savedUsage) : {};
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return {};
    }
  });

  // Check for current user and set userId
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUserId(session?.user?.id || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user points from profiles table
  useEffect(() => {
    if (!userId) return;

    const fetchUserPoints = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user points:', error);
          return;
        }

        if (profile) {
          setTotalPoints(profile.points);
        }
      } catch (error) {
        console.error('Error fetching user points:', error);
      }
    };

    fetchUserPoints();
  }, [userId]);

  // Fetch rewards from Supabase
  useEffect(() => {
    const fetchRewards = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('rewards')
          .select('*');

        if (error) {
          console.error('Error fetching rewards:', error);
          // Fallback to initial rewards if there's an error
          setRewards(initialRewards);
          return;
        }

        if (data && data.length > 0) {
          // Map Supabase data to our RewardItem interface
          const mappedRewards: RewardItem[] = data.map((reward: SupabaseReward) => ({
            id: reward.id,
            title: reward.title,
            description: reward.description || '',
            cost: reward.cost,
            supply: 0, // Default supply to 0, will be updated from user_rewards
            iconName: reward.icon_name || 'Gift', // Map icon_name from Supabase to iconName for component
            icon_name: reward.icon_name || 'Gift',
            icon_color: reward.icon_color || '#9b87f5',
            background_image_url: reward.background_image_url || undefined,
            background_opacity: reward.background_opacity || 100,
            focal_point_x: reward.focal_point_x || 50,
            focal_point_y: reward.focal_point_y || 50,
            highlight_effect: reward.highlight_effect || false,
            title_color: reward.title_color || '#FFFFFF',
            subtext_color: reward.subtext_color || '#8E9196',
            calendar_color: reward.calendar_color || '#7E69AB',
          }));
          setRewards(mappedRewards);
        } else {
          // If no rewards found, use initialRewards
          setRewards(initialRewards);
        }
      } catch (error) {
        console.error('Error fetching rewards:', error);
        setRewards(initialRewards);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewards();
  }, []);

  // Fetch user_rewards to get supply counts for each reward
  useEffect(() => {
    if (!userId) return;

    const fetchUserRewards = async () => {
      try {
        const { data, error } = await supabase
          .from('user_rewards')
          .select('*')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching user rewards:', error);
          return;
        }

        if (data) {
          setUserRewards(data);
          
          // Update the rewards with the correct supply counts
          setRewards(prevRewards => 
            prevRewards.map(reward => {
              const userReward = data.find(ur => ur.reward_id === reward.id);
              return {
                ...reward,
                supply: userReward ? userReward.supply : 0,
              };
            })
          );
        }
      } catch (error) {
        console.error('Error fetching user rewards:', error);
      }
    };

    fetchUserRewards();
  }, [userId]);

  // Save rewardUsage to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(REWARD_USAGE_STORAGE_KEY, JSON.stringify(rewardUsage));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      // Implement a fallback or error handling mechanism
    }
  }, [rewardUsage]);

  // Check if we need to reset the weekly tracking
  useEffect(() => {
    try {
      const lastResetKey = 'lastWeeklyReset';
      const lastReset = localStorage.getItem(lastResetKey);
      const now = new Date();
      const currentWeek = `${now.getFullYear()}-${now.getMonth() + 1}-${Math.floor(now.getDate() / 7)}`;
      
      if (lastReset !== currentWeek) {
        // Reset weekly tracking
        localStorage.setItem(lastResetKey, currentWeek);
        setRewardUsage({});
      }
    } catch (error) {
      console.error('Error checking weekly reset:', error);
    }
  }, []);

  // Get the current day of week (0-6, Sunday-Saturday)
  const getCurrentDayOfWeek = () => {
    return new Date().getDay();
  };

  // Handle buying a reward
  const handleBuy = async (rewardId: string) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to buy rewards",
        variant: "destructive",
      });
      return;
    }

    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;
    
    // Check if user has enough points
    if (totalPoints >= reward.cost) {
      try {
        // 1. Update user points in profiles table
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: totalPoints - reward.cost })
          .eq('id', userId);

        if (pointsError) throw pointsError;

        // 2. Check if user already has this reward
        const existingUserReward = userRewards.find(ur => ur.reward_id === rewardId);

        if (existingUserReward) {
          // Update existing user_reward
          const { error: updateError } = await supabase
            .from('user_rewards')
            .update({ supply: existingUserReward.supply + 1 })
            .eq('id', existingUserReward.id);

          if (updateError) throw updateError;

          // Update local state
          setUserRewards(prevUserRewards => 
            prevUserRewards.map(ur => 
              ur.id === existingUserReward.id 
                ? { ...ur, supply: ur.supply + 1 } 
                : ur
            )
          );
        } else {
          // Create new user_reward using upsert
          const { data: newUserReward, error: insertError } = await supabase
            .from('user_rewards')
            .upsert([
              { 
                user_id: userId, 
                reward_id: rewardId, 
                supply: 1 
              }
            ])
            .select()
            .single();

          if (insertError) throw insertError;

          if (newUserReward) {
            setUserRewards(prev => [...prev, newUserReward]);
          }
        }

        // Update local state
        setTotalPoints(totalPoints - reward.cost);
        setRewards(prevRewards => 
          prevRewards.map(r => 
            r.id === rewardId 
              ? { ...r, supply: r.supply + 1 } 
              : r
          )
        );

        toast({
          title: "Reward purchased",
          description: `You purchased ${reward.title}`,
        });
      } catch (error) {
        console.error('Error buying reward:', error);
        toast({
          title: "Error",
          description: "Failed to purchase reward. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Not enough points",
        description: `You need ${reward.cost - totalPoints} more points`,
        variant: "destructive",
      });
    }
  };

  // Handle using a reward
  const handleUse = async (rewardId: string) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use rewards",
        variant: "destructive",
      });
      return;
    }

    const reward = rewards.find(r => r.id === rewardId);
    if (!reward || reward.supply <= 0) return;

    const userReward = userRewards.find(ur => ur.reward_id === rewardId);
    if (!userReward || userReward.supply <= 0) return;

    try {
      // Update user_reward in database
      const { error } = await supabase
        .from('user_rewards')
        .update({ supply: userReward.supply - 1 })
        .eq('id', userReward.id);

      if (error) throw error;

      // Update local states
      setUserRewards(prevUserRewards => 
        prevUserRewards.map(ur => 
          ur.id === userReward.id 
            ? { ...ur, supply: ur.supply - 1 } 
            : ur
        )
      );

      setRewards(prevRewards => 
        prevRewards.map(r => 
          r.id === rewardId 
            ? { ...r, supply: r.supply - 1 } 
            : r
        )
      );

      // Update usage tracking for this reward
      const currentDay = getCurrentDayOfWeek();
      const rewardKey = `reward-${rewardId}`;
      
      const updatedUsage = { ...rewardUsage };
      if (!updatedUsage[rewardKey]) {
        updatedUsage[rewardKey] = Array(7).fill(false);
      }
      
      updatedUsage[rewardKey][currentDay] = true;
      setRewardUsage(updatedUsage);

      toast({
        title: "Reward used",
        description: `You used ${reward.title}`,
      });
    } catch (error) {
      console.error('Error using reward:', error);
      toast({
        title: "Error",
        description: "Failed to use reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get usage data for a specific reward
  const getRewardUsage = (rewardId: string) => {
    const rewardKey = `reward-${rewardId}`;
    return rewardUsage[rewardKey] || Array(7).fill(false);
  };
  
  // Calculate frequency count (number of days used this week)
  const getFrequencyCount = (rewardId: string) => {
    const usage = getRewardUsage(rewardId);
    return usage.filter(Boolean).length;
  };

  // Handle saving edited or new reward
  const handleSaveReward = async (rewardData: any, index: number | null) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save rewards",
        variant: "destructive",
      });
      return;
    }

    try {
      // Format the reward data to match the database schema
      const formattedData = {
        title: rewardData.title,
        description: rewardData.description,
        cost: rewardData.cost || 0,
        icon_name: rewardData.iconName || rewardData.icon_name,
        icon_color: rewardData.icon_color || '#9b87f5',
        background_image_url: rewardData.background_image_url,
        background_opacity: rewardData.background_opacity || 100,
        focal_point_x: rewardData.focal_point_x || 50,
        focal_point_y: rewardData.focal_point_y || 50,
        highlight_effect: rewardData.highlight_effect || false,
        title_color: rewardData.title_color || '#FFFFFF',
        subtext_color: rewardData.subtext_color || '#8E9196',
        calendar_color: rewardData.calendar_color || '#7E69AB',
        updated_at: new Date().toISOString(),
      };

      let savedReward;
      
      if (index !== null && rewards[index]?.id) {
        // Update existing reward
        const { data, error } = await supabase
          .from('rewards')
          .update(formattedData)
          .eq('id', rewards[index].id)
          .select()
          .single();

        if (error) throw error;
        savedReward = data;

        // Update local state
        setRewards(prevRewards => 
          prevRewards.map((r, i) => 
            i === index ? { 
              ...r, 
              ...formattedData,
              iconName: formattedData.icon_name // Ensure iconName is updated to match icon_name
            } : r
          )
        );

        toast({
          title: "Reward updated",
          description: "Your changes have been saved",
        });
      } else {
        // Add new reward using upsert for better reliability
        const { data, error } = await supabase
          .from('rewards')
          .upsert([formattedData])
          .select()
          .single();

        if (error) throw error;
        savedReward = data;

        if (savedReward) {
          // Add new reward to state with supply 0 and map icon_name to iconName
          setRewards(prevRewards => [
            ...prevRewards, 
            { 
              ...savedReward, 
              supply: 0,
              iconName: savedReward.icon_name // Set iconName from icon_name
            }
          ]);

          toast({
            title: "Reward created",
            description: "Your new reward has been added",
          });
        }
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting a reward
  const handleDeleteReward = async (rewardId: string) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to delete rewards",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete the reward from the database
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

      if (error) throw error;

      // Remove from local state
      setRewards(prevRewards => prevRewards.filter(r => r.id !== rewardId));
      
      // Clean up the usage data
      const updatedUsage = { ...rewardUsage };
      delete updatedUsage[`reward-${rewardId}`];
      setRewardUsage(updatedUsage);

      toast({
        title: "Reward deleted",
        description: "Reward has been removed",
      });
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast({
        title: "Error",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading rewards...</div>;
  }

  return (
    <RewardsContext.Provider
      value={{
        totalPoints,
        rewards,
        rewardUsage,
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
