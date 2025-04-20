
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import RewardEditor from '../components/RewardEditor';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';
import { Loader2 } from 'lucide-react';
import { useRewardsQuery } from '@/hooks/useRewardsQuery';

const Rewards: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState<any>(null);
  const [currentRewardIndex, setCurrentRewardIndex] = useState<number | null>(null);
  
  const { 
    rewards, 
    isLoading, 
    createReward, 
    updateReward, 
    deleteReward, 
    buyReward, 
    useReward,
    refetchRewards 
  } = useRewardsQuery();

  // Handle adding a new reward
  const handleAddNewReward = () => {
    setCurrentReward(null);
    setCurrentRewardIndex(null);
    setIsEditorOpen(true);
  };

  // Handle editing a reward
  const handleEdit = (index: number) => {
    setCurrentReward({
      ...rewards[index],
      index
    });
    setCurrentRewardIndex(index);
    setIsEditorOpen(true);
  };

  // Handle saving edited reward
  const handleSave = async (rewardData: any) => {
    if (rewardData.id) {
      await updateReward(rewardData.id, rewardData);
    } else {
      await createReward(rewardData);
    }
    
    closeEditor();
    refetchRewards();
  };

  // Handle deleting a reward
  const handleDelete = async (index: number) => {
    const rewardToDelete = rewards[index];
    if (rewardToDelete && rewardToDelete.id) {
      await deleteReward(rewardToDelete.id);
      closeEditor();
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setCurrentReward(null);
    setCurrentRewardIndex(null);
  };

  // Handle buying a reward
  const handleBuyReward = async (id: string, cost: number) => {
    await buyReward(id, cost);
    // Optional: Refresh rewards supply and points after buying
    await refetchRewards();
  };

  // Handle using a reward
  const handleUseReward = async (id: string) => {
    await useReward(id);
    // Refresh rewards after usage to update usageData on UI and reflect circle fill
    await refetchRewards();
  };

  return (
    <AppLayout onAddNewItem={handleAddNewReward}>
      <div className="p-4 pt-6 w-full max-w-full">
        <RewardsHeader />
        
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white mb-4">No rewards found. Create your first reward!</p>
          </div>
        ) : (
          <RewardsList 
            rewards={rewards} 
            onEdit={handleEdit}
            onBuy={handleBuyReward}
            onUse={handleUseReward}
          />
        )}
        
        <RewardEditor
          isOpen={isEditorOpen}
          onClose={closeEditor}
          rewardData={currentReward}
          onSave={handleSave}
          onDelete={currentRewardIndex !== null ? () => handleDelete(currentRewardIndex) : undefined}
        />
      </div>
    </AppLayout>
  );
};

export default Rewards;
