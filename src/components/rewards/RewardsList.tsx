
import React, { useState } from 'react';
import { useRewards } from '@/contexts/RewardsContext';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RewardCard from './RewardCard';
import { Reward } from '@/lib/rewardUtils';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, isLoading, error } = useRewards();
  const [activeTab, setActiveTab] = useState('regular');
  
  // Filter rewards based on active tab
  const regularRewards = rewards.filter(reward => !reward.is_dom_reward);
  const domRewards = rewards.filter(reward => reward.is_dom_reward);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center my-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  
  // Show error message if there is an error
  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-white my-6">
        <h3 className="font-bold mb-2">Error Loading Rewards</h3>
        <p>{error.message}</p>
      </div>
    );
  }
  
  // Show empty state if there are no rewards
  if (rewards.length === 0) {
    return (
      <div className="text-center my-12">
        <p className="text-gray-400">No rewards available yet.</p>
        <p className="text-gray-400 mt-1">Click the + button to create your first reward.</p>
      </div>
    );
  }
  
  // Find the index of a reward in the original array
  const findRewardIndex = (reward: Reward) => {
    return rewards.findIndex(r => r.id === reward.id);
  };
  
  return (
    <Tabs defaultValue="regular" className="w-full" onValueChange={setActiveTab} value={activeTab}>
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="regular">Regular Rewards</TabsTrigger>
        <TabsTrigger value="dom">Dom Rewards</TabsTrigger>
      </TabsList>
      <TabsContent value="regular" className="space-y-4">
        {regularRewards.length === 0 ? (
          <p className="text-center text-gray-400 my-8">No regular rewards available.</p>
        ) : (
          regularRewards.map((reward, i) => (
            <RewardCard 
              key={reward.id || i} 
              {...reward} 
              onEdit={() => onEdit(findRewardIndex(reward))}
            />
          ))
        )}
      </TabsContent>
      <TabsContent value="dom" className="space-y-4">
        {domRewards.length === 0 ? (
          <p className="text-center text-gray-400 my-8">No dom rewards available.</p>
        ) : (
          domRewards.map((reward, i) => (
            <RewardCard 
              key={reward.id || i} 
              {...reward}
              onEdit={() => onEdit(findRewardIndex(reward))}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};

export default RewardsList;
