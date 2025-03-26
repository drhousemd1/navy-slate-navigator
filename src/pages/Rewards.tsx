
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import RewardEditor from '../components/RewardEditor';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import RewardsHeader from '../components/rewards/RewardsHeader';
import RewardsList from '../components/rewards/RewardsList';

const RewardsContent: React.FC = () => {
  const { rewards, handleSaveReward, handleDeleteReward } = useRewards();
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState<any>(null);
  const [currentRewardIndex, setCurrentRewardIndex] = useState<number | null>(null);

  // Handle editing a reward
  const handleEdit = (index: number) => {
    setCurrentReward(rewards[index]);
    setCurrentRewardIndex(index);
    setIsEditorOpen(true);
  };

  // Handle adding a new reward
  const handleAddNewItem = () => {
    setCurrentReward(null);
    setCurrentRewardIndex(null);
    setIsEditorOpen(true);
  };

  // Handle saving edited reward
  const handleSave = (rewardData: any) => {
    handleSaveReward(rewardData, currentRewardIndex);
    closeEditor();
  };

  // Handle deleting a reward
  const handleDelete = (index: number) => {
    if (index !== null) {
      handleDeleteReward(index);
      closeEditor();
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setCurrentReward(null);
    setCurrentRewardIndex(null);
  };

  return (
    <div className="p-4 pt-6">
      <RewardsHeader />
      <RewardsList onEdit={handleEdit} onAddNewItem={handleAddNewItem} />
      
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={closeEditor}
        rewardData={currentReward}
        onSave={handleSave}
        onDelete={() => currentRewardIndex !== null && handleDelete(currentRewardIndex)}
      />
    </div>
  );
};

const Rewards: React.FC = () => {
  return (
    <AppLayout>
      <RewardsProvider>
        <RewardsContent />
      </RewardsProvider>
    </AppLayout>
  );
};

export default Rewards;
