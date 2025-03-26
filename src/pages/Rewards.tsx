
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import RewardCard from '../components/RewardCard';
import { fetchRewards, fetchUserProfile, fetchUserRewards, Reward, UserReward } from '@/lib/rewardsUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Rewards: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch rewards
  const { 
    data: rewards, 
    isLoading: isLoadingRewards,
    error: rewardsError
  } = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
  });

  // Fetch user profile for points
  const { 
    data: userProfile, 
    isLoading: isLoadingProfile,
    error: profileError
  } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });

  // Fetch user rewards
  const { 
    data: userRewards, 
    isLoading: isLoadingUserRewards,
    error: userRewardsError
  } = useQuery({
    queryKey: ['userRewards'],
    queryFn: fetchUserRewards,
  });

  // Function to find user supply for a specific reward
  const getUserSupply = (rewardId: string): number => {
    if (!userRewards) return 0;
    
    const userReward = userRewards.find(ur => ur.reward_id === rewardId);
    return userReward ? userReward.supply : 0;
  };

  // Check if we need to seed example rewards
  React.useEffect(() => {
    const seedExampleRewards = async () => {
      if (rewards && rewards.length === 0) {
        const exampleRewards = [
          {
            title: "Movie Night",
            description: "Watch any movie of your choice",
            cost: 20,
            icon_name: "Film",
            icon_color: "#9b87f5"
          },
          {
            title: "Gaming Session",
            description: "1 hour of uninterrupted gaming time",
            cost: 15,
            icon_name: "Gamepad2",
            icon_color: "#9b87f5"
          },
          {
            title: "Dessert Treat",
            description: "Get your favorite dessert",
            cost: 25,
            icon_name: "Cake",
            icon_color: "#9b87f5"
          },
          {
            title: "Sleep In",
            description: "Sleep an extra hour in the morning",
            cost: 30,
            icon_name: "Moon",
            icon_color: "#9b87f5"
          }
        ];

        try {
          const { error } = await supabase.from('rewards').insert(exampleRewards);
          
          if (error) {
            console.error('Error seeding rewards:', error);
          } else {
            // Refresh rewards data
            queryClient.invalidateQueries({ queryKey: ['rewards'] });
          }
        } catch (error) {
          console.error('Unexpected error seeding rewards:', error);
        }
      }
    };

    if (!isLoadingRewards && !rewardsError) {
      seedExampleRewards();
    }
  }, [rewards, isLoadingRewards, rewardsError, queryClient]);

  // Handle refresh data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['rewards'] });
    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    queryClient.invalidateQueries({ queryKey: ['userRewards'] });
  };

  if (rewardsError || profileError || userRewardsError) {
    return (
      <AppLayout>
        <div className="p-4 pt-6">
          <h1 className="text-2xl font-semibold text-white mb-4">My Rewards</h1>
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-md">
            <p className="text-white">
              Error loading rewards data. Please try again later.
            </p>
            <Button 
              variant="outline"
              onClick={handleRefresh}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-white">My Rewards</h1>
          <div className="flex items-center gap-2">
            {userProfile && (
              <div className="bg-navy border border-blue-500 text-white py-1 px-3 rounded-full">
                <span className="font-bold">{userProfile.points}</span> points
              </div>
            )}
            <Button size="sm" variant="outline" className="text-blue-500 border-blue-500">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
        
        {(isLoadingRewards || isLoadingProfile || isLoadingUserRewards) ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-32 w-full bg-gray-800/50" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {rewards && rewards.length > 0 ? (
              rewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  userSupply={getUserSupply(reward.id)}
                  userPoints={userProfile?.points || 0}
                  onRewardUpdated={handleRefresh}
                />
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p>No rewards available yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Rewards;
